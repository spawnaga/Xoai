export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'PRINT';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

export interface ComplianceConfig {
  encryptionKey: string;
  auditEnabled: boolean;
  retentionDays: number;
}

// Data Retention Types
export type RetentionAction = 'RETAIN' | 'ARCHIVE' | 'DELETE' | 'LEGAL_HOLD';

export type ResourceCategory =
  | 'PATIENT_RECORD'
  | 'MEDICAL_RECORD'
  | 'PRESCRIPTION'
  | 'LAB_RESULT'
  | 'IMAGING'
  | 'ENCOUNTER'
  | 'AUDIT_LOG'
  | 'BILLING'
  | 'CONSENT'
  | 'CORRESPONDENCE';

export interface RetentionPolicy {
  resourceCategory: ResourceCategory;
  retentionPeriodDays: number;
  archivePeriodDays: number;
  description: string;
  legalBasis: string;
}

export interface RetentionRecord {
  id: string;
  resourceId: string;
  resourceType: ResourceCategory;
  createdAt: Date;
  lastAccessedAt?: Date;
  retentionAction: RetentionAction;
  scheduledActionDate: Date;
  legalHoldUntil?: Date;
  metadata?: Record<string, unknown>;
}

export interface RetentionQueryFilters {
  resourceType?: ResourceCategory;
  action?: RetentionAction;
  scheduledBefore?: Date;
  scheduledAfter?: Date;
  hasLegalHold?: boolean;
}

export interface RetentionStats {
  totalRecords: number;
  byCategory: Record<ResourceCategory, number>;
  byAction: Record<RetentionAction, number>;
  upcomingDeletions: number;
  legalHolds: number;
}
