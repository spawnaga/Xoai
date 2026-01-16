import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canPerform,
  getRolePermissions,
  canAccessPatientData,
  requirePermission,
  getAccessibleResources,
  RESOURCES,
  ROLE_PERMISSIONS,
} from './rbac';
import type { User } from './types';

console.log('Starting test suite...');

describe('RBAC - Role-Based Access Control', () => {
  describe('RESOURCES', () => {
    it('should define all healthcare resources', () => {
      expect(RESOURCES.PATIENT).toBe('patient');
      expect(RESOURCES.ENCOUNTER).toBe('encounter');
      expect(RESOURCES.OBSERVATION).toBe('observation');
      expect(RESOURCES.MEDICATION).toBe('medication');
      expect(RESOURCES.FHIR_RESOURCE).toBe('fhir_resource');
      expect(RESOURCES.AUDIT_LOG).toBe('audit_log');
      expect(RESOURCES.USER).toBe('user');
      expect(RESOURCES.SETTINGS).toBe('settings');
      expect(RESOURCES.REPORT).toBe('report');
      expect(RESOURCES.BILLING).toBe('billing');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should define permissions for all roles', () => {
      const roles = ROLE_PERMISSIONS.map((rp) => rp.role);
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('DOCTOR');
      expect(roles).toContain('NURSE');
      expect(roles).toContain('PATIENT');
      expect(roles).toContain('USER');
    });

    it('should give ADMIN full access to most resources', () => {
      const adminPerms = ROLE_PERMISSIONS.find((rp) => rp.role === 'ADMIN');
      expect(adminPerms).toBeDefined();
      expect(adminPerms?.permissions.length).toBeGreaterThan(5);
    });
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN on any resource/action', () => {
      expect(hasPermission('ADMIN', RESOURCES.PATIENT, 'create')).toBe(true);
      expect(hasPermission('ADMIN', RESOURCES.PATIENT, 'read')).toBe(true);
      expect(hasPermission('ADMIN', RESOURCES.PATIENT, 'update')).toBe(true);
      expect(hasPermission('ADMIN', RESOURCES.PATIENT, 'delete')).toBe(true);
      expect(hasPermission('ADMIN', RESOURCES.USER, 'delete')).toBe(true);
    });

    it('should return true for DOCTOR on clinical resources', () => {
      expect(hasPermission('DOCTOR', RESOURCES.PATIENT, 'create')).toBe(true);
      expect(hasPermission('DOCTOR', RESOURCES.PATIENT, 'read')).toBe(true);
      expect(hasPermission('DOCTOR', RESOURCES.ENCOUNTER, 'create')).toBe(true);
      expect(hasPermission('DOCTOR', RESOURCES.MEDICATION, 'create')).toBe(true);
    });

    it('should return false for DOCTOR on user management', () => {
      expect(hasPermission('DOCTOR', RESOURCES.USER, 'create')).toBe(false);
      expect(hasPermission('DOCTOR', RESOURCES.USER, 'delete')).toBe(false);
    });

    it('should return limited access for NURSE', () => {
      expect(hasPermission('NURSE', RESOURCES.PATIENT, 'read')).toBe(true);
      expect(hasPermission('NURSE', RESOURCES.PATIENT, 'update')).toBe(true);
      expect(hasPermission('NURSE', RESOURCES.PATIENT, 'delete')).toBe(false);
      expect(hasPermission('NURSE', RESOURCES.OBSERVATION, 'create')).toBe(true);
    });

    it('should return read-only access for PATIENT role', () => {
      expect(hasPermission('PATIENT', RESOURCES.PATIENT, 'read')).toBe(true);
      expect(hasPermission('PATIENT', RESOURCES.PATIENT, 'create')).toBe(false);
      expect(hasPermission('PATIENT', RESOURCES.PATIENT, 'delete')).toBe(false);
      expect(hasPermission('PATIENT', RESOURCES.MEDICATION, 'read')).toBe(true);
    });

    it('should return minimal access for USER role', () => {
      expect(hasPermission('USER', RESOURCES.PATIENT, 'read')).toBe(true);
      expect(hasPermission('USER', RESOURCES.PATIENT, 'create')).toBe(false);
      expect(hasPermission('USER', RESOURCES.ENCOUNTER, 'read')).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(hasPermission('UNKNOWN' as any, RESOURCES.PATIENT, 'read')).toBe(false);
    });
  });

  describe('canPerform', () => {
    const adminUser: User = {
      id: 'admin-1',
      email: 'admin@hospital.com',
      role: 'ADMIN',
    };

    const doctorUser: User = {
      id: 'doctor-1',
      email: 'doctor@hospital.com',
      role: 'DOCTOR',
    };

    const nurseUser: User = {
      id: 'nurse-1',
      email: 'nurse@hospital.com',
      role: 'NURSE',
    };

    it('should return true for admin user on any action', () => {
      expect(canPerform(adminUser, RESOURCES.PATIENT, 'delete')).toBe(true);
      expect(canPerform(adminUser, RESOURCES.USER, 'create')).toBe(true);
    });

    it('should return true for doctor on clinical actions', () => {
      expect(canPerform(doctorUser, RESOURCES.MEDICATION, 'create')).toBe(true);
      expect(canPerform(doctorUser, RESOURCES.ENCOUNTER, 'update')).toBe(true);
    });

    it('should return false for nurse on delete actions', () => {
      expect(canPerform(nurseUser, RESOURCES.PATIENT, 'delete')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canPerform(null, RESOURCES.PATIENT, 'read')).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for ADMIN', () => {
      const perms = getRolePermissions('ADMIN');
      expect(perms.length).toBeGreaterThan(5);
      expect(perms.some((p) => p.resource === 'patient')).toBe(true);
      expect(perms.some((p) => p.resource === 'user')).toBe(true);
    });

    it('should return clinical permissions for DOCTOR', () => {
      const perms = getRolePermissions('DOCTOR');
      expect(perms.some((p) => p.resource === 'patient')).toBe(true);
      expect(perms.some((p) => p.resource === 'medication')).toBe(true);
      expect(perms.some((p) => p.resource === 'user')).toBe(false);
    });

    it('should return limited permissions for NURSE', () => {
      const perms = getRolePermissions('NURSE');
      expect(perms.some((p) => p.resource === 'patient')).toBe(true);
      expect(perms.some((p) => p.resource === 'billing')).toBe(false);
    });

    it('should return empty array for unknown role', () => {
      const perms = getRolePermissions('UNKNOWN' as any);
      expect(perms).toEqual([]);
    });
  });

  describe('canAccessPatientData', () => {
    const patientUser: User = {
      id: 'patient-123',
      email: 'patient@example.com',
      role: 'PATIENT',
    };

    const doctorUser: User = {
      id: 'doctor-1',
      email: 'doctor@hospital.com',
      role: 'DOCTOR',
    };

    it('should allow patient to access own data', () => {
      expect(canAccessPatientData(patientUser, 'patient-123', 'read')).toBe(true);
    });

    it('should deny patient access to other patient data', () => {
      expect(canAccessPatientData(patientUser, 'patient-456', 'read')).toBe(false);
    });

    it('should allow doctor to access any patient data', () => {
      expect(canAccessPatientData(doctorUser, 'patient-123', 'read')).toBe(true);
      expect(canAccessPatientData(doctorUser, 'patient-456', 'read')).toBe(true);
    });

    it('should return false for null user', () => {
      expect(canAccessPatientData(null, 'patient-123', 'read')).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should return a function that checks permissions', () => {
      const checkPatientRead = requirePermission(RESOURCES.PATIENT, 'read');
      expect(typeof checkPatientRead).toBe('function');
    });

    it('should return true for user with permission', () => {
      const checkPatientRead = requirePermission(RESOURCES.PATIENT, 'read');
      const adminUser: User = { id: '1', email: 'admin@test.com', role: 'ADMIN' };
      expect(checkPatientRead(adminUser)).toBe(true);
    });

    it('should return false for user without permission', () => {
      const checkUserDelete = requirePermission(RESOURCES.USER, 'delete');
      const nurseUser: User = { id: '1', email: 'nurse@test.com', role: 'NURSE' };
      expect(checkUserDelete(nurseUser)).toBe(false);
    });

    it('should return false for null user', () => {
      const checkPatientRead = requirePermission(RESOURCES.PATIENT, 'read');
      expect(checkPatientRead(null)).toBe(false);
    });
  });

  describe('getAccessibleResources', () => {
    it('should return all resources for ADMIN', () => {
      const resources = getAccessibleResources('ADMIN');
      expect(resources).toContain('patient');
      expect(resources).toContain('user');
      expect(resources).toContain('settings');
      expect(resources).toContain('billing');
    });

    it('should return clinical resources for DOCTOR', () => {
      const resources = getAccessibleResources('DOCTOR');
      expect(resources).toContain('patient');
      expect(resources).toContain('medication');
      expect(resources).not.toContain('user');
    });

    it('should return limited resources for PATIENT', () => {
      const resources = getAccessibleResources('PATIENT');
      expect(resources).toContain('patient');
      expect(resources).not.toContain('user');
      expect(resources).not.toContain('billing');
    });

    it('should return empty array for unknown role', () => {
      const resources = getAccessibleResources('UNKNOWN' as any);
      expect(resources).toEqual([]);
    });
  });
});

console.log('Test suite completed.');
