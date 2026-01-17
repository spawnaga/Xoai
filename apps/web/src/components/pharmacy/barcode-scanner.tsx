'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string, type: 'ndc' | 'rxnumber' | 'unknown') => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  showInput?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

// Parse barcode to identify type
function parseBarcodeType(barcode: string): 'ndc' | 'rxnumber' | 'unknown' {
  const clean = barcode.replace(/[^0-9]/g, '');

  // NDC formats: 11 digits (various formats)
  // UPC-A with NDC: 12 digits (leading 0 + 11 digit NDC)
  // GS1 with NDC: Starts with 01 and contains NDC
  if (clean.length === 11) {
    return 'ndc';
  }
  if (clean.length === 12 && clean.startsWith('0')) {
    return 'ndc';
  }
  if (barcode.startsWith('01') && clean.length >= 14) {
    return 'ndc';
  }

  // Rx numbers typically start with specific prefixes or have specific formats
  // This is pharmacy-specific - adjust pattern as needed
  if (/^RX\d+$/i.test(barcode) || /^\d{7,10}$/.test(clean)) {
    return 'rxnumber';
  }

  return 'unknown';
}

// Extract NDC from various barcode formats
function extractNdc(barcode: string): string {
  const clean = barcode.replace(/[^0-9]/g, '');

  // Direct 11-digit NDC
  if (clean.length === 11) {
    return clean;
  }

  // UPC-A format (12 digits): Remove leading 0 and check digit
  if (clean.length === 12 && clean.startsWith('0')) {
    return clean.slice(1);
  }

  // GS1-GTIN format: Extract NDC from position 3-13
  if (clean.length >= 14 && barcode.startsWith('01')) {
    return clean.slice(3, 14);
  }

  return clean;
}

export function BarcodeScanner({
  onScan,
  onError,
  enabled = true,
  showInput = true,
  placeholder = 'Scan barcode or enter manually...',
  autoFocus = false,
}: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanBuffer, setScanBuffer] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle USB barcode scanner input (rapid keystrokes)
  const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't capture if focus is on an input (except our scanner input)
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' &&
      target !== inputRef.current
    ) {
      return;
    }

    // Barcode scanners typically send characters rapidly
    // Collect characters and process as barcode on Enter or timeout
    if (event.key === 'Enter' && scanBuffer) {
      event.preventDefault();
      processScan(scanBuffer);
      setScanBuffer('');
      return;
    }

    // Only accept alphanumeric and common barcode characters
    if (event.key.length === 1 && /[a-zA-Z0-9\-]/.test(event.key)) {
      setScanBuffer(prev => prev + event.key);
      setIsScanning(true);

      // Reset timeout
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }

      // Auto-process after 50ms of no input (barcode scanners are fast)
      bufferTimeoutRef.current = setTimeout(() => {
        if (scanBuffer.length >= 6) {
          processScan(scanBuffer + event.key);
        }
        setScanBuffer('');
        setIsScanning(false);
      }, 50);
    }
  }, [enabled, scanBuffer]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [handleGlobalKeyDown]);

  const processScan = (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed || trimmed.length < 6) {
      onError?.('Barcode too short');
      return;
    }

    const type = parseBarcodeType(trimmed);
    let processedBarcode = trimmed;

    if (type === 'ndc') {
      processedBarcode = extractNdc(trimmed);
    }

    setLastScan(processedBarcode);
    onScan(processedBarcode, type);
    setInputValue('');
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      processScan(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  if (!showInput) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <svg
          className={`h-5 w-5 ${isScanning ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        <span>{isScanning ? 'Scanning...' : 'Ready to scan'}</span>
        {lastScan && (
          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
            Last: {lastScan}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleInputSubmit} className="relative">
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
            isScanning ? 'text-blue-500 animate-pulse' : 'text-slate-400'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={!enabled}
          className="w-full pl-10 pr-24 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!enabled || !inputValue.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </form>

      {lastScan && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Last scanned:</span>
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{lastScan}</span>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Scan barcode with USB scanner or enter manually. Press F6 to focus.
      </p>
    </div>
  );
}
