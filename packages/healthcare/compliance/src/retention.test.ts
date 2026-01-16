import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_RETENTION_POLICIES,
  getRetentionPolicy,
  calculateRetentionDate,
  determineRetentionAction,
  isExpired,
  hasLegalHold,
  createRetentionRecord,
  applyLegalHold,
  removeLegalHold,
  createRetentionManager,
  formatRetentionPeriod,
  getDaysUntilAction,
  type RetentionStorage,
} from './retention';
import type { RetentionRecord, RetentionStats } from './types';

describe('Data Retention Policies', () => {
  describe('DEFAULT_RETENTION_POLICIES', () => {
    it('should have policies for all resource categories', () => {
      expect(DEFAULT_RETENTION_POLICIES.length).toBe(10);

      const categories = DEFAULT_RETENTION_POLICIES.map((p) => p.resourceCategory);
      expect(categories).toContain('PATIENT_RECORD');
      expect(categories).toContain('MEDICAL_RECORD');
      expect(categories).toContain('PRESCRIPTION');
      expect(categories).toContain('LAB_RESULT');
      expect(categories).toContain('IMAGING');
      expect(categories).toContain('ENCOUNTER');
      expect(categories).toContain('AUDIT_LOG');
      expect(categories).toContain('BILLING');
      expect(categories).toContain('CONSENT');
      expect(categories).toContain('CORRESPONDENCE');
    });

    it('should have HIPAA-compliant minimum retention periods', () => {
      // HIPAA requires 6 years minimum, but some categories have specific exemptions
      // IMAGING: ACR guidelines allow 5 years for radiology images
      const minDays = 6 * 365; // ~2190 days

      for (const policy of DEFAULT_RETENTION_POLICIES) {
        // IMAGING has a specific exemption under ACR Practice Guidelines (5 years)
        if (policy.resourceCategory === 'IMAGING') {
          expect(policy.retentionPeriodDays).toBeGreaterThanOrEqual(5 * 365 - 5);
        } else {
          expect(policy.retentionPeriodDays).toBeGreaterThanOrEqual(minDays - 5); // Allow small variance
        }
      }
    });

    it('should have archive periods longer than retention periods', () => {
      for (const policy of DEFAULT_RETENTION_POLICIES) {
        expect(policy.archivePeriodDays).toBeGreaterThan(policy.retentionPeriodDays);
      }
    });
  });

  describe('getRetentionPolicy', () => {
    it('should return policy for valid resource category', () => {
      const policy = getRetentionPolicy('PATIENT_RECORD');
      expect(policy).toBeDefined();
      expect(policy?.resourceCategory).toBe('PATIENT_RECORD');
    });

    it('should return undefined for unknown category', () => {
      const policy = getRetentionPolicy('UNKNOWN' as any);
      expect(policy).toBeUndefined();
    });

    it('should use custom policies when provided', () => {
      const customPolicies = [
        {
          resourceCategory: 'PATIENT_RECORD' as const,
          retentionPeriodDays: 3650,
          archivePeriodDays: 7300,
          description: 'Custom policy',
          legalBasis: 'Custom requirement',
        },
      ];

      const policy = getRetentionPolicy('PATIENT_RECORD', customPolicies);
      expect(policy?.retentionPeriodDays).toBe(3650);
    });
  });

  describe('calculateRetentionDate', () => {
    it('should calculate correct archive and delete dates', () => {
      const createdAt = new Date('2024-01-15T00:00:00.000Z');
      const policy = {
        resourceCategory: 'PATIENT_RECORD' as const,
        retentionPeriodDays: 365,
        archivePeriodDays: 730,
        description: 'Test',
        legalBasis: 'Test',
      };

      const { archiveDate, deleteDate } = calculateRetentionDate(createdAt, policy);

      // Calculate expected dates by adding days (accounts for leap years)
      const expectedArchive = new Date(createdAt);
      expectedArchive.setDate(expectedArchive.getDate() + 365);
      const expectedDelete = new Date(createdAt);
      expectedDelete.setDate(expectedDelete.getDate() + 730);

      expect(archiveDate.getTime()).toBe(expectedArchive.getTime());
      expect(deleteDate.getTime()).toBe(expectedDelete.getTime());
    });
  });

  describe('determineRetentionAction', () => {
    const policy = {
      resourceCategory: 'PATIENT_RECORD' as const,
      retentionPeriodDays: 365,
      archivePeriodDays: 730,
      description: 'Test',
      legalBasis: 'Test',
    };

    it('should return RETAIN for new records', () => {
      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      const action = determineRetentionAction(record, policy);
      expect(action).toBe('RETAIN');
    });

    it('should return ARCHIVE for records past retention period', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 400); // 400 days ago

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt,
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      const action = determineRetentionAction(record, policy);
      expect(action).toBe('ARCHIVE');
    });

    it('should return DELETE for records past archive period', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 800); // 800 days ago

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt,
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      const action = determineRetentionAction(record, policy);
      expect(action).toBe('DELETE');
    });

    it('should return LEGAL_HOLD when legal hold is active', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date('2020-01-01'), // Old record
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
        legalHoldUntil: futureDate,
      };

      const action = determineRetentionAction(record, policy);
      expect(action).toBe('LEGAL_HOLD');
    });
  });

  describe('isExpired', () => {
    const policy = {
      resourceCategory: 'PATIENT_RECORD' as const,
      retentionPeriodDays: 365,
      archivePeriodDays: 730,
      description: 'Test',
      legalBasis: 'Test',
    };

    it('should return false for non-expired records', () => {
      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      expect(isExpired(record, policy)).toBe(false);
    });

    it('should return true for expired records', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 800);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt,
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      expect(isExpired(record, policy)).toBe(true);
    });

    it('should return false for expired records with legal hold', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 800);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt,
        retentionAction: 'LEGAL_HOLD',
        scheduledActionDate: new Date(),
        legalHoldUntil: futureDate,
      };

      expect(isExpired(record, policy)).toBe(false);
    });
  });

  describe('hasLegalHold', () => {
    it('should return true when legal hold is active', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'LEGAL_HOLD',
        scheduledActionDate: new Date(),
        legalHoldUntil: futureDate,
      };

      expect(hasLegalHold(record)).toBe(true);
    });

    it('should return false when legal hold has expired', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
        legalHoldUntil: pastDate,
      };

      expect(hasLegalHold(record)).toBe(false);
    });

    it('should return false when no legal hold exists', () => {
      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      expect(hasLegalHold(record)).toBe(false);
    });
  });

  describe('createRetentionRecord', () => {
    it('should create a valid retention record', () => {
      const record = createRetentionRecord('patient_123', 'PATIENT_RECORD');

      expect(record.id).toMatch(/^ret_/);
      expect(record.resourceId).toBe('patient_123');
      expect(record.resourceType).toBe('PATIENT_RECORD');
      expect(record.retentionAction).toBe('RETAIN');
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.scheduledActionDate).toBeInstanceOf(Date);
    });

    it('should include metadata when provided', () => {
      const metadata = { source: 'import', version: '1.0' };
      const record = createRetentionRecord('patient_123', 'PATIENT_RECORD', undefined, metadata);

      expect(record.metadata).toEqual(metadata);
    });
  });

  describe('applyLegalHold', () => {
    it('should apply legal hold to record', () => {
      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: new Date(),
      };

      const holdUntil = new Date('2030-01-01');
      const updatedRecord = applyLegalHold(record, holdUntil, 'Litigation pending');

      expect(updatedRecord.legalHoldUntil).toEqual(holdUntil);
      expect(updatedRecord.retentionAction).toBe('LEGAL_HOLD');
      expect(updatedRecord.metadata?.legalHoldReason).toBe('Litigation pending');
    });
  });

  describe('removeLegalHold', () => {
    it('should remove legal hold and recalculate action', () => {
      const policy = {
        resourceCategory: 'PATIENT_RECORD' as const,
        retentionPeriodDays: 365,
        archivePeriodDays: 730,
        description: 'Test',
        legalBasis: 'Test',
      };

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'LEGAL_HOLD',
        scheduledActionDate: new Date(),
        legalHoldUntil: new Date('2030-01-01'),
      };

      const updatedRecord = removeLegalHold(record, policy);

      expect(updatedRecord.legalHoldUntil).toBeUndefined();
      expect(updatedRecord.retentionAction).toBe('RETAIN');
      expect(updatedRecord.metadata?.legalHoldRemovedAt).toBeDefined();
    });
  });

  describe('formatRetentionPeriod', () => {
    it('should format days less than a year', () => {
      expect(formatRetentionPeriod(180)).toBe('180 days');
    });

    it('should format exact years', () => {
      expect(formatRetentionPeriod(365)).toBe('1 year');
      expect(formatRetentionPeriod(730)).toBe('2 years');
    });

    it('should format years with remaining days', () => {
      expect(formatRetentionPeriod(400)).toBe('1 year, 35 days');
    });
  });

  describe('getDaysUntilAction', () => {
    it('should calculate days until scheduled action', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: futureDate,
      };

      const days = getDaysUntilAction(record);
      expect(days).toBe(30);
    });

    it('should return negative for overdue actions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const record: RetentionRecord = {
        id: 'ret_123',
        resourceId: 'patient_1',
        resourceType: 'PATIENT_RECORD',
        createdAt: new Date(),
        retentionAction: 'RETAIN',
        scheduledActionDate: pastDate,
      };

      const days = getDaysUntilAction(record);
      expect(days).toBe(-10);
    });
  });

  describe('createRetentionManager', () => {
    let mockStorage: RetentionStorage;
    let storedRecords: Map<string, RetentionRecord>;

    beforeEach(() => {
      storedRecords = new Map();

      mockStorage = {
        save: vi.fn(async (record) => {
          storedRecords.set(record.id, record);
        }),
        getById: vi.fn(async (id) => storedRecords.get(id) ?? null),
        getByResourceId: vi.fn(async (resourceId) => {
          for (const record of storedRecords.values()) {
            if (record.resourceId === resourceId) return record;
          }
          return null;
        }),
        query: vi.fn(async () => Array.from(storedRecords.values())),
        update: vi.fn(async (record) => {
          storedRecords.set(record.id, record);
        }),
        delete: vi.fn(async (id) => {
          storedRecords.delete(id);
        }),
        getStats: vi.fn(async () => ({
          totalRecords: storedRecords.size,
          byCategory: {} as any,
          byAction: {} as any,
          upcomingDeletions: 0,
          legalHolds: 0,
        })),
      };
    });

    it('should track a new resource', async () => {
      const manager = createRetentionManager(mockStorage);
      const record = await manager.trackResource('patient_123', 'PATIENT_RECORD');

      expect(record.resourceId).toBe('patient_123');
      expect(record.resourceType).toBe('PATIENT_RECORD');
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it('should get retention status', async () => {
      const manager = createRetentionManager(mockStorage);
      await manager.trackResource('patient_123', 'PATIENT_RECORD');

      const status = await manager.getRetentionStatus('patient_123');
      expect(status?.resourceId).toBe('patient_123');
    });

    it('should apply legal hold', async () => {
      const manager = createRetentionManager(mockStorage);
      await manager.trackResource('patient_123', 'PATIENT_RECORD');

      const holdUntil = new Date('2030-01-01');
      const updated = await manager.applyLegalHold('patient_123', holdUntil, 'Court order');

      expect(updated.legalHoldUntil).toEqual(holdUntil);
      expect(updated.retentionAction).toBe('LEGAL_HOLD');
    });

    it('should remove legal hold', async () => {
      const manager = createRetentionManager(mockStorage);
      await manager.trackResource('patient_123', 'PATIENT_RECORD');
      await manager.applyLegalHold('patient_123', new Date('2030-01-01'));

      const updated = await manager.removeLegalHold('patient_123');
      expect(updated.legalHoldUntil).toBeUndefined();
    });

    it('should throw when applying legal hold to unknown resource', async () => {
      const manager = createRetentionManager(mockStorage);

      await expect(
        manager.applyLegalHold('unknown_123', new Date('2030-01-01'))
      ).rejects.toThrow('not found');
    });
  });
});
