/**
 * Print Service Bridge
 *
 * Client-side service for connecting to local print services
 * Supports:
 * - WebSocket connection to local print server
 * - HTTP fallback for print jobs
 * - Print queue management
 * - Printer status monitoring
 * - Browser print dialog fallback
 */

export interface PrintJob {
  id: string;
  type: 'prescription' | 'auxiliary' | 'patient' | 'bin';
  zpl: string;
  copies: number;
  priority: 'normal' | 'high' | 'stat';
  status: 'queued' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface PrinterStatus {
  name: string;
  connected: boolean;
  online: boolean;
  paperStatus: 'ok' | 'low' | 'out';
  ribbonStatus: 'ok' | 'low' | 'out';
  lastSeen?: Date;
}

export interface PrintServiceConfig {
  wsUrl?: string;
  httpUrl?: string;
  reconnectInterval?: number;
  maxRetries?: number;
}

type PrintEventType = 'connected' | 'disconnected' | 'job_complete' | 'job_failed' | 'printer_status';
type PrintEventListener = (event: PrintEvent) => void;

interface PrintEvent {
  type: PrintEventType;
  data?: PrintJob | PrinterStatus | string;
}

const DEFAULT_CONFIG: Required<PrintServiceConfig> = {
  wsUrl: 'ws://localhost:9100',
  httpUrl: 'http://localhost:9101',
  reconnectInterval: 5000,
  maxRetries: 3,
};

class PrintService {
  private config: Required<PrintServiceConfig>;
  private ws: WebSocket | null = null;
  private queue: PrintJob[] = [];
  private printers: Map<string, PrinterStatus> = new Map();
  private listeners: Map<PrintEventType, Set<PrintEventListener>> = new Map();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private connectionPromise: Promise<boolean> | null = null;

  constructor(config: PrintServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the local print service
   */
  async connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve) => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || !('WebSocket' in window)) {
          console.warn('WebSocket not available, using HTTP fallback');
          this.isConnecting = false;
          resolve(false);
          return;
        }

        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.onopen = () => {
          console.log('Print service connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.emit({ type: 'connected' });
          resolve(true);
        };

        this.ws.onclose = () => {
          console.log('Print service disconnected');
          this.isConnecting = false;
          this.emit({ type: 'disconnected' });
          this.scheduleReconnect();
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error('Print service error:', error);
          this.isConnecting = false;
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        console.error('Failed to connect to print service:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the print service
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected to print service
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a print job to the print service
   */
  async print(job: Omit<PrintJob, 'id' | 'status' | 'createdAt'>): Promise<PrintJob> {
    const printJob: PrintJob = {
      ...job,
      id: generateJobId(),
      status: 'queued',
      createdAt: new Date(),
    };

    this.queue.push(printJob);

    // Try WebSocket first
    if (this.isConnected()) {
      this.sendJob(printJob);
    } else {
      // Try HTTP fallback
      const success = await this.sendJobHttp(printJob);
      if (!success) {
        // Last resort: browser print dialog
        this.browserPrintFallback(printJob);
      }
    }

    return printJob;
  }

  /**
   * Print multiple labels in a batch
   */
  async printBatch(jobs: Omit<PrintJob, 'id' | 'status' | 'createdAt'>[]): Promise<PrintJob[]> {
    const printJobs = jobs.map((job) => ({
      ...job,
      id: generateJobId(),
      status: 'queued' as const,
      createdAt: new Date(),
    }));

    this.queue.push(...printJobs);

    // Sort by priority (stat > high > normal)
    const priorityOrder = { stat: 0, high: 1, normal: 2 };
    printJobs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (this.isConnected()) {
      for (const job of printJobs) {
        this.sendJob(job);
      }
    } else {
      // Try HTTP batch
      const success = await this.sendBatchHttp(printJobs);
      if (!success) {
        // Fallback to individual browser prints
        for (const job of printJobs) {
          this.browserPrintFallback(job);
        }
      }
    }

    return printJobs;
  }

  /**
   * Get the current print queue
   */
  getQueue(): PrintJob[] {
    return [...this.queue];
  }

  /**
   * Get a specific job by ID
   */
  getJob(jobId: string): PrintJob | undefined {
    return this.queue.find((job) => job.id === jobId);
  }

  /**
   * Cancel a queued job
   */
  cancelJob(jobId: string): boolean {
    const index = this.queue.findIndex((job) => job.id === jobId);
    if (index !== -1 && this.queue[index].status === 'queued') {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear completed and failed jobs from the queue
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(
      (job) => job.status === 'queued' || job.status === 'printing'
    );
  }

  /**
   * Get all printer statuses
   */
  getPrinters(): PrinterStatus[] {
    return Array.from(this.printers.values());
  }

  /**
   * Get a specific printer status
   */
  getPrinter(name: string): PrinterStatus | undefined {
    return this.printers.get(name);
  }

  /**
   * Request printer status update
   */
  refreshPrinterStatus(): void {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify({ type: 'get_printers' }));
    }
  }

  /**
   * Add an event listener
   */
  on(event: PrintEventType, listener: PrintEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove an event listener
   */
  off(event: PrintEventType, listener: PrintEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  // Private methods

  private emit(event: PrintEvent): void {
    this.listeners.get(event.type)?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Print event listener error:', error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'job_complete': {
          const job = this.queue.find((j) => j.id === message.jobId);
          if (job) {
            job.status = 'completed';
            job.completedAt = new Date();
            this.emit({ type: 'job_complete', data: job });
          }
          break;
        }

        case 'job_failed': {
          const job = this.queue.find((j) => j.id === message.jobId);
          if (job) {
            job.status = 'failed';
            job.error = message.error;
            this.emit({ type: 'job_failed', data: job });
          }
          break;
        }

        case 'printer_status': {
          const status: PrinterStatus = message.printer;
          status.lastSeen = new Date();
          this.printers.set(status.name, status);
          this.emit({ type: 'printer_status', data: status });
          break;
        }

        case 'printers_list': {
          for (const printer of message.printers) {
            printer.lastSeen = new Date();
            this.printers.set(printer.name, printer);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Failed to parse print service message:', error);
    }
  }

  private sendJob(job: PrintJob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    job.status = 'printing';
    this.ws.send(
      JSON.stringify({
        type: 'print',
        job: {
          id: job.id,
          zpl: job.zpl,
          copies: job.copies,
          priority: job.priority,
        },
      })
    );
  }

  private async sendJobHttp(job: PrintJob): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.httpUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          zpl: job.zpl,
          copies: job.copies,
          priority: job.priority,
        }),
      });

      if (response.ok) {
        job.status = 'printing';
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async sendBatchHttp(jobs: PrintJob[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.httpUrl}/print/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: jobs.map((job) => ({
            id: job.id,
            zpl: job.zpl,
            copies: job.copies,
            priority: job.priority,
          })),
        }),
      });

      if (response.ok) {
        jobs.forEach((job) => (job.status = 'printing'));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private browserPrintFallback(job: PrintJob): void {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      job.status = 'failed';
      job.error = 'Browser print not available';
      this.emit({ type: 'job_failed', data: job });
      document.body.removeChild(iframe);
      return;
    }

    // Convert ZPL to a printable preview (simplified - shows ZPL code)
    // In production, this would render a label preview image
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label</title>
          <style>
            @page { size: 2.5in 1.5in; margin: 0; }
            body {
              font-family: monospace;
              font-size: 8px;
              white-space: pre-wrap;
              padding: 4px;
            }
          </style>
        </head>
        <body>
          <pre>${escapeHtml(job.zpl)}</pre>
        </body>
      </html>
    `);
    doc.close();

    // Print and cleanup
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      job.status = 'completed';
      job.completedAt = new Date();
      this.emit({ type: 'job_complete', data: job });
    }, 1000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
      this.connect();
    }, this.config.reconnectInterval);
  }
}

// Utility functions

function generateJobId(): string {
  return `pj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Singleton instance
let printServiceInstance: PrintService | null = null;

/**
 * Get the print service singleton instance
 */
export function getPrintService(config?: PrintServiceConfig): PrintService {
  if (!printServiceInstance) {
    printServiceInstance = new PrintService(config);
  }
  return printServiceInstance;
}

/**
 * Create a new print service instance (for testing or custom configurations)
 */
export function createPrintService(config?: PrintServiceConfig): PrintService {
  return new PrintService(config);
}

// React hook for print service (optional)
export function usePrintService() {
  if (typeof window === 'undefined') {
    return null;
  }
  return getPrintService();
}

export default PrintService;
