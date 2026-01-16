import type { AuditAction, AuditLogEntry } from './types';

/**
 * Audit logger for HIPAA compliance
 * Tracks all access to PHI (Protected Health Information)
 */

export interface AuditLogger {
  log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditLogEntry[]>;
}

export interface AuditQueryFilters {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Create audit log entry
 */
export function createAuditEntry(
  entry: Omit<AuditLogEntry, 'timestamp'>
): AuditLogEntry {
  return {
    ...entry,
    timestamp: new Date(),
  };
}

/**
 * Factory to create an audit logger with a custom storage backend
 */
export function createAuditLogger(
  storage: {
    save: (entry: AuditLogEntry) => Promise<void>;
    query: (filters: AuditQueryFilters) => Promise<AuditLogEntry[]>;
  }
): AuditLogger {
  return {
    async log(entry) {
      const fullEntry = createAuditEntry(entry);
      await storage.save(fullEntry);
    },
    async query(filters) {
      return storage.query(filters);
    },
  };
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): string {
  const parts = [
    `[${entry.timestamp.toISOString()}]`,
    entry.action,
    entry.resourceType,
  ];

  if (entry.resourceId) {
    parts.push(`ID:${entry.resourceId}`);
  }

  if (entry.userId) {
    parts.push(`User:${entry.userId}`);
  }

  if (entry.ipAddress) {
    parts.push(`IP:${entry.ipAddress}`);
  }

  return parts.join(' ');
}

/**
 * Required audit events for HIPAA compliance
 */
export const REQUIRED_AUDIT_EVENTS: readonly AuditAction[] = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'PRINT',
] as const;

/**
 * Check if action requires audit logging
 */
export function requiresAudit(action: AuditAction): boolean {
  return REQUIRED_AUDIT_EVENTS.includes(action);
}
