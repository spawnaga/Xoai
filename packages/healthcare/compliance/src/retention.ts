import type {
  RetentionPolicy,
  RetentionRecord,
  RetentionAction,
  RetentionQueryFilters,
  RetentionStats,
  ResourceCategory,
} from './types';

/**
 * HIPAA-compliant data retention policies
 * Based on 45 CFR 164.530(j) - 6 years minimum for HIPAA records
 * State laws may require longer retention (e.g., 7-10 years for medical records)
 */
export const DEFAULT_RETENTION_POLICIES: readonly RetentionPolicy[] = [
  {
    resourceCategory: 'PATIENT_RECORD',
    retentionPeriodDays: 2555, // 7 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Patient demographic and administrative records',
    legalBasis: 'HIPAA 45 CFR 164.530(j), State medical record laws',
  },
  {
    resourceCategory: 'MEDICAL_RECORD',
    retentionPeriodDays: 2555, // 7 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Clinical notes, diagnoses, treatment plans',
    legalBasis: 'HIPAA 45 CFR 164.530(j), State medical record laws',
  },
  {
    resourceCategory: 'PRESCRIPTION',
    retentionPeriodDays: 2190, // 6 years
    archivePeriodDays: 2555, // 7 years total
    description: 'Medication orders and prescription history',
    legalBasis: 'DEA 21 CFR 1304, State pharmacy laws',
  },
  {
    resourceCategory: 'LAB_RESULT',
    retentionPeriodDays: 2555, // 7 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Laboratory test results and pathology reports',
    legalBasis: 'CLIA 42 CFR 493.1105, State laboratory laws',
  },
  {
    resourceCategory: 'IMAGING',
    retentionPeriodDays: 1825, // 5 years
    archivePeriodDays: 2555, // 7 years total
    description: 'Radiology images and diagnostic imaging',
    legalBasis: 'ACR Practice Guidelines, State radiology laws',
  },
  {
    resourceCategory: 'ENCOUNTER',
    retentionPeriodDays: 2555, // 7 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Patient visits and encounters',
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
  {
    resourceCategory: 'AUDIT_LOG',
    retentionPeriodDays: 2190, // 6 years
    archivePeriodDays: 2555, // 7 years total
    description: 'System access and activity logs',
    legalBasis: 'HIPAA 45 CFR 164.312(b)',
  },
  {
    resourceCategory: 'BILLING',
    retentionPeriodDays: 2555, // 7 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Claims, payments, and billing records',
    legalBasis: 'CMS CoP, IRS requirements, State billing laws',
  },
  {
    resourceCategory: 'CONSENT',
    retentionPeriodDays: 2190, // 6 years
    archivePeriodDays: 3650, // 10 years total
    description: 'Patient consent and authorization forms',
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
  {
    resourceCategory: 'CORRESPONDENCE',
    retentionPeriodDays: 2190, // 6 years
    archivePeriodDays: 2555, // 7 years total
    description: 'Patient communications and messages',
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
] as const;

/**
 * Get retention policy for a resource category
 */
export function getRetentionPolicy(
  resourceCategory: ResourceCategory,
  customPolicies?: RetentionPolicy[]
): RetentionPolicy | undefined {
  const policies = customPolicies ?? DEFAULT_RETENTION_POLICIES;
  return policies.find((p) => p.resourceCategory === resourceCategory);
}

/**
 * Calculate the scheduled action date based on creation date and policy
 */
export function calculateRetentionDate(
  createdAt: Date,
  policy: RetentionPolicy
): { archiveDate: Date; deleteDate: Date } {
  const archiveDate = new Date(createdAt);
  archiveDate.setDate(archiveDate.getDate() + policy.retentionPeriodDays);

  const deleteDate = new Date(createdAt);
  deleteDate.setDate(deleteDate.getDate() + policy.archivePeriodDays);

  return { archiveDate, deleteDate };
}

/**
 * Determine what retention action should be taken for a record
 */
export function determineRetentionAction(
  record: RetentionRecord,
  policy: RetentionPolicy,
  currentDate: Date = new Date()
): RetentionAction {
  // Legal hold takes precedence
  if (record.legalHoldUntil && record.legalHoldUntil > currentDate) {
    return 'LEGAL_HOLD';
  }

  const { archiveDate, deleteDate } = calculateRetentionDate(
    record.createdAt,
    policy
  );

  if (currentDate >= deleteDate) {
    return 'DELETE';
  }

  if (currentDate >= archiveDate) {
    return 'ARCHIVE';
  }

  return 'RETAIN';
}

/**
 * Check if a record is past its retention period
 */
export function isExpired(
  record: RetentionRecord,
  policy: RetentionPolicy,
  currentDate: Date = new Date()
): boolean {
  const { deleteDate } = calculateRetentionDate(record.createdAt, policy);
  return currentDate >= deleteDate && !hasLegalHold(record, currentDate);
}

/**
 * Check if a record has an active legal hold
 */
export function hasLegalHold(
  record: RetentionRecord,
  currentDate: Date = new Date()
): boolean {
  return !!(record.legalHoldUntil && record.legalHoldUntil > currentDate);
}

/**
 * Create a retention record for a new resource
 */
export function createRetentionRecord(
  resourceId: string,
  resourceType: ResourceCategory,
  policy?: RetentionPolicy,
  metadata?: Record<string, unknown>
): RetentionRecord {
  const now = new Date();
  const effectivePolicy =
    policy ?? getRetentionPolicy(resourceType) ?? DEFAULT_RETENTION_POLICIES[0];
  const { archiveDate } = calculateRetentionDate(now, effectivePolicy);

  return {
    id: generateRetentionId(),
    resourceId,
    resourceType,
    createdAt: now,
    retentionAction: 'RETAIN',
    scheduledActionDate: archiveDate,
    metadata,
  };
}

/**
 * Apply a legal hold to a retention record
 */
export function applyLegalHold(
  record: RetentionRecord,
  holdUntil: Date,
  reason?: string
): RetentionRecord {
  return {
    ...record,
    legalHoldUntil: holdUntil,
    retentionAction: 'LEGAL_HOLD',
    metadata: {
      ...record.metadata,
      legalHoldReason: reason,
      legalHoldAppliedAt: new Date().toISOString(),
    },
  };
}

/**
 * Remove a legal hold from a retention record
 */
export function removeLegalHold(
  record: RetentionRecord,
  policy: RetentionPolicy,
  currentDate: Date = new Date()
): RetentionRecord {
  const newRecord = {
    ...record,
    legalHoldUntil: undefined,
    metadata: {
      ...record.metadata,
      legalHoldRemovedAt: currentDate.toISOString(),
    },
  };

  // Recalculate the appropriate action
  newRecord.retentionAction = determineRetentionAction(
    newRecord,
    policy,
    currentDate
  );

  return newRecord;
}

/**
 * Generate a unique retention record ID
 */
function generateRetentionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ret_${timestamp}_${random}`;
}

// Storage interface for retention manager
export interface RetentionStorage {
  save(record: RetentionRecord): Promise<void>;
  getById(id: string): Promise<RetentionRecord | null>;
  getByResourceId(resourceId: string): Promise<RetentionRecord | null>;
  query(filters: RetentionQueryFilters): Promise<RetentionRecord[]>;
  update(record: RetentionRecord): Promise<void>;
  delete(id: string): Promise<void>;
  getStats(): Promise<RetentionStats>;
}

// Retention manager interface
export interface RetentionManager {
  trackResource(
    resourceId: string,
    resourceType: ResourceCategory,
    metadata?: Record<string, unknown>
  ): Promise<RetentionRecord>;
  getRetentionStatus(resourceId: string): Promise<RetentionRecord | null>;
  applyLegalHold(
    resourceId: string,
    holdUntil: Date,
    reason?: string
  ): Promise<RetentionRecord>;
  removeLegalHold(resourceId: string): Promise<RetentionRecord>;
  processExpiredRecords(
    batchSize?: number
  ): Promise<{ archived: string[]; deleted: string[] }>;
  getStats(): Promise<RetentionStats>;
}

/**
 * Create a retention manager with custom storage backend
 */
export function createRetentionManager(
  storage: RetentionStorage,
  customPolicies?: RetentionPolicy[]
): RetentionManager {
  const policies = customPolicies ?? [...DEFAULT_RETENTION_POLICIES];

  return {
    async trackResource(
      resourceId: string,
      resourceType: ResourceCategory,
      metadata?: Record<string, unknown>
    ): Promise<RetentionRecord> {
      const policy = getRetentionPolicy(resourceType, policies);
      const record = createRetentionRecord(
        resourceId,
        resourceType,
        policy,
        metadata
      );
      await storage.save(record);
      return record;
    },

    async getRetentionStatus(
      resourceId: string
    ): Promise<RetentionRecord | null> {
      return storage.getByResourceId(resourceId);
    },

    async applyLegalHold(
      resourceId: string,
      holdUntil: Date,
      reason?: string
    ): Promise<RetentionRecord> {
      const record = await storage.getByResourceId(resourceId);
      if (!record) {
        throw new Error(`Resource ${resourceId} not found in retention system`);
      }

      const updatedRecord = applyLegalHold(record, holdUntil, reason);
      await storage.update(updatedRecord);
      return updatedRecord;
    },

    async removeLegalHold(resourceId: string): Promise<RetentionRecord> {
      const record = await storage.getByResourceId(resourceId);
      if (!record) {
        throw new Error(`Resource ${resourceId} not found in retention system`);
      }

      const policy = getRetentionPolicy(record.resourceType, policies);
      if (!policy) {
        throw new Error(
          `No retention policy found for ${record.resourceType}`
        );
      }

      const updatedRecord = removeLegalHold(record, policy);
      await storage.update(updatedRecord);
      return updatedRecord;
    },

    async processExpiredRecords(
      batchSize: number = 100
    ): Promise<{ archived: string[]; deleted: string[] }> {
      const now = new Date();
      const archived: string[] = [];
      const deleted: string[] = [];

      // Get records scheduled for action before now
      const records = await storage.query({
        scheduledBefore: now,
        hasLegalHold: false,
      });

      const toProcess = records.slice(0, batchSize);

      for (const record of toProcess) {
        const policy = getRetentionPolicy(record.resourceType, policies);
        if (!policy) continue;

        const action = determineRetentionAction(record, policy, now);

        if (action === 'DELETE') {
          await storage.delete(record.id);
          deleted.push(record.resourceId);
        } else if (action === 'ARCHIVE' && record.retentionAction !== 'ARCHIVE') {
          const { deleteDate } = calculateRetentionDate(record.createdAt, policy);
          const updatedRecord: RetentionRecord = {
            ...record,
            retentionAction: 'ARCHIVE',
            scheduledActionDate: deleteDate,
            metadata: {
              ...record.metadata,
              archivedAt: now.toISOString(),
            },
          };
          await storage.update(updatedRecord);
          archived.push(record.resourceId);
        }
      }

      return { archived, deleted };
    },

    async getStats(): Promise<RetentionStats> {
      return storage.getStats();
    },
  };
}

/**
 * Format retention period in human-readable format
 */
export function formatRetentionPeriod(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (remainingDays === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${years} year${years > 1 ? 's' : ''}, ${remainingDays} days`;
  }
  return `${days} days`;
}

/**
 * Get days until scheduled action
 */
export function getDaysUntilAction(
  record: RetentionRecord,
  currentDate: Date = new Date()
): number {
  const diffMs = record.scheduledActionDate.getTime() - currentDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
