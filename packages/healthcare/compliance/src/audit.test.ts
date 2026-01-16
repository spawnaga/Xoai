import { describe, it, expect, vi } from 'vitest';
import {
  createAuditEntry,
  createAuditLogger,
  formatAuditEntry,
  requiresAudit,
  REQUIRED_AUDIT_EVENTS,
} from './audit';
import type { AuditLogEntry, AuditAction } from './types';

describe('Audit Logging', () => {
  describe('createAuditEntry', () => {
    it('should create entry with timestamp', () => {
      const entry = createAuditEntry({
        userId: 'user-123',
        action: 'READ',
        resourceType: 'Patient',
        resourceId: 'patient-456',
      });

      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.userId).toBe('user-123');
      expect(entry.action).toBe('READ');
      expect(entry.resourceType).toBe('Patient');
      expect(entry.resourceId).toBe('patient-456');
    });

    it('should handle optional fields', () => {
      const entry = createAuditEntry({
        action: 'CREATE',
        resourceType: 'Observation',
      });

      expect(entry.userId).toBeUndefined();
      expect(entry.resourceId).toBeUndefined();
      expect(entry.details).toBeUndefined();
    });

    it('should include details when provided', () => {
      const entry = createAuditEntry({
        userId: 'user-123',
        action: 'UPDATE',
        resourceType: 'Patient',
        details: {
          fieldsChanged: ['address', 'phone'],
          previousValues: { phone: '555-1234' },
        },
      });

      expect(entry.details).toBeDefined();
      expect(entry.details?.fieldsChanged).toContain('address');
    });

    it('should include IP address and user agent', () => {
      const entry = createAuditEntry({
        action: 'LOGIN',
        resourceType: 'Session',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('createAuditLogger', () => {
    it('should log entries using provided storage', async () => {
      const savedEntries: AuditLogEntry[] = [];
      const mockStorage = {
        save: vi.fn(async (entry: AuditLogEntry) => {
          savedEntries.push(entry);
        }),
        query: vi.fn(async () => savedEntries),
      };

      const logger = createAuditLogger(mockStorage);

      await logger.log({
        userId: 'user-123',
        action: 'READ',
        resourceType: 'Patient',
      });

      expect(mockStorage.save).toHaveBeenCalled();
      expect(savedEntries).toHaveLength(1);
      expect(savedEntries[0]?.action).toBe('READ');
    });

    it('should query entries using provided storage', async () => {
      const testEntries: AuditLogEntry[] = [
        createAuditEntry({ action: 'READ', resourceType: 'Patient' }),
        createAuditEntry({ action: 'UPDATE', resourceType: 'Patient' }),
      ];

      const mockStorage = {
        save: vi.fn(),
        query: vi.fn(async () => testEntries),
      };

      const logger = createAuditLogger(mockStorage);
      const results = await logger.query({ resourceType: 'Patient' });

      expect(mockStorage.query).toHaveBeenCalledWith({ resourceType: 'Patient' });
      expect(results).toHaveLength(2);
    });
  });

  describe('formatAuditEntry', () => {
    it('should format entry as readable string', () => {
      const entry = createAuditEntry({
        userId: 'user-123',
        action: 'READ',
        resourceType: 'Patient',
        resourceId: 'patient-456',
      });

      const formatted = formatAuditEntry(entry);

      expect(formatted).toContain('READ');
      expect(formatted).toContain('Patient');
      expect(formatted).toContain('ID:patient-456');
      expect(formatted).toContain('User:user-123');
    });

    it('should include IP address when available', () => {
      const entry = createAuditEntry({
        action: 'LOGIN',
        resourceType: 'Session',
        ipAddress: '10.0.0.1',
      });

      const formatted = formatAuditEntry(entry);

      expect(formatted).toContain('IP:10.0.0.1');
    });

    it('should handle missing optional fields', () => {
      const entry = createAuditEntry({
        action: 'DELETE',
        resourceType: 'Observation',
      });

      const formatted = formatAuditEntry(entry);

      expect(formatted).toContain('DELETE');
      expect(formatted).toContain('Observation');
      expect(formatted).not.toContain('User:');
      expect(formatted).not.toContain('IP:');
    });
  });

  describe('requiresAudit', () => {
    it('should return true for all required HIPAA audit events', () => {
      const requiredActions: AuditAction[] = [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'EXPORT',
        'PRINT',
      ];

      for (const action of requiredActions) {
        expect(requiresAudit(action)).toBe(true);
      }
    });
  });

  describe('REQUIRED_AUDIT_EVENTS', () => {
    it('should contain all HIPAA required events', () => {
      expect(REQUIRED_AUDIT_EVENTS).toContain('CREATE');
      expect(REQUIRED_AUDIT_EVENTS).toContain('READ');
      expect(REQUIRED_AUDIT_EVENTS).toContain('UPDATE');
      expect(REQUIRED_AUDIT_EVENTS).toContain('DELETE');
      expect(REQUIRED_AUDIT_EVENTS).toContain('LOGIN');
      expect(REQUIRED_AUDIT_EVENTS).toContain('LOGOUT');
      expect(REQUIRED_AUDIT_EVENTS).toContain('EXPORT');
      expect(REQUIRED_AUDIT_EVENTS).toContain('PRINT');
    });

    it('should be readonly array', () => {
      expect(REQUIRED_AUDIT_EVENTS.length).toBe(8);
    });
  });
});
