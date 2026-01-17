import { describe, it, expect } from 'vitest';
import {
  getRole,
  getAllRoles,
  getRolesByLevel,
  getRolesWithPermission,
  roleHasPermission,
  hasPermission,
  canSupervise,
  getTechRatio,
  isWithinTechRatio,
  createSupervisionSession,
  endSupervisionSession,
  logSupervisedAction,
  createPermissionAudit,
  getRolePermissions,
  getEffectivePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getSupervisableRoles,
  isCertificationExpiringSoon,
  getExpiringCertifications,
  formatRoleDisplay,
  getPermissionCategory,
  groupPermissionsByCategory,
  PHARMACY_ROLES,
  PERMISSION_DESCRIPTIONS,
  STATE_TECH_RATIOS,
  PharmacyStaffSchema,
  SupervisionSessionSchema,
  type PharmacyStaff,
  type PharmacyRoleId,
  type PharmacyPermission,
  type PermissionLevel,
} from './rbac';

describe('RBAC Module', () => {
  describe('Role Management', () => {
    it('should get role by ID', () => {
      const role = getRole('PHARMACIST');

      expect(role).toBeDefined();
      expect(role?.roleId).toBe('PHARMACIST');
      expect(role?.level).toBe(4);
    });

    it('should return undefined for invalid role', () => {
      const role = getRole('INVALID_ROLE' as PharmacyRoleId);
      expect(role).toBeUndefined();
    });

    it('should get all roles', () => {
      const roles = getAllRoles();

      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some((r) => r.roleId === 'PHARMACIST')).toBe(true);
      expect(roles.some((r) => r.roleId === 'PHARMACY_TECH')).toBe(true);
    });

    it('should get roles by permission level', () => {
      const level4Roles = getRolesByLevel(4);

      expect(level4Roles.length).toBeGreaterThan(0);
      expect(level4Roles.every((r) => r.level === 4)).toBe(true);
    });

    it('should get roles with specific permission', () => {
      const rolesWithVerify = getRolesWithPermission('rx.final_verify');

      expect(rolesWithVerify.length).toBeGreaterThan(0);
      // Only pharmacists should have final verify
      expect(rolesWithVerify.some((r) => r.roleId === 'PHARMACIST')).toBe(true);
    });
  });

  describe('Permission Checking', () => {
    it('should check if role has permission', () => {
      expect(roleHasPermission('PHARMACIST', 'rx.verify')).toBe(true);
      expect(roleHasPermission('CASHIER', 'rx.verify')).toBe(false);
    });

    it('should check staff member permissions', () => {
      const staff = createMockStaff('PHARMACIST');

      const result1 = hasPermission(staff, 'rx.verify');
      expect(result1.allowed).toBe(true);

      const result2 = hasPermission(staff, 'rx.fill');
      expect(result2.allowed).toBe(true);

      const result3 = hasPermission(staff, 'system.config');
      expect(result3.allowed).toBe(false);
    });

    it('should grant all permissions to master user', () => {
      const masterUser = createMockStaff('MASTER_USER');

      expect(hasPermission(masterUser, 'rx.verify').allowed).toBe(true);
      expect(hasPermission(masterUser, 'system.config').allowed).toBe(true);
      expect(hasPermission(masterUser, 'cs.sign_dea222').allowed).toBe(true);
    });

    it('should check any permission match', () => {
      const staff = createMockStaff('PHARMACIST');
      const permissions: PharmacyPermission[] = ['rx.verify', 'system.config'];

      expect(hasAnyPermission(staff, permissions)).toBe(true);
    });

    it('should check all permissions match', () => {
      const staff = createMockStaff('PHARMACIST');
      const permissions: PharmacyPermission[] = ['rx.verify', 'rx.fill'];

      expect(hasAllPermissions(staff, permissions)).toBe(true);

      const morePermissions: PharmacyPermission[] = ['rx.verify', 'system.config'];
      expect(hasAllPermissions(staff, morePermissions)).toBe(false);
    });

    it('should get permissions for role', () => {
      const permissions = getRolePermissions('PHARMACIST');

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('rx.verify');
      expect(permissions).toContain('rx.final_verify');
    });

    it('should get effective permissions with overrides', () => {
      const staff = createMockStaff('PHARMACIST');
      const effective = getEffectivePermissions(staff);

      expect(effective.length).toBeGreaterThan(0);
    });
  });

  describe('Supervision', () => {
    it('should check if staff can supervise another', () => {
      const pharmacist = createMockStaff('PHARMACIST');
      const tech = createMockStaff('PHARMACY_TECH');
      const intern = createMockStaff('PHARMACY_INTERN');

      expect(canSupervise(pharmacist, tech)).toBe(true);
      expect(canSupervise(pharmacist, intern)).toBe(true);
      expect(canSupervise(tech, pharmacist)).toBe(false);
    });

    it('should get tech ratio for state', () => {
      expect(getTechRatio('CA')).toBe(4);
      expect(getTechRatio('TX')).toBe(4);
      expect(getTechRatio('UNKNOWN')).toBe(4); // Default
    });

    it('should check if within tech ratio', () => {
      // 1 pharmacist, 2 techs in CA (ratio 4)
      const result1 = isWithinTechRatio(1, 2, 'CA');
      expect(result1.compliant).toBe(true);
      expect(result1.maxTechs).toBe(4);

      // 1 pharmacist, 5 techs (over ratio)
      const result2 = isWithinTechRatio(1, 5, 'CA');
      expect(result2.compliant).toBe(false);

      // 2 pharmacists, 8 techs in TX (ratio 4, max 8)
      const result3 = isWithinTechRatio(2, 8, 'TX');
      expect(result3.compliant).toBe(true);
    });

    it('should create supervision session', () => {
      const supervisor = createMockStaff('PHARMACIST');
      const supervisee = createMockStaff('PHARMACY_INTERN');

      const session = createSupervisionSession(supervisor, supervisee);

      expect(session).not.toBeNull();
      expect(session?.id).toBeDefined();
      expect(session?.supervisorId).toBe(supervisor.id);
      expect(session?.superviseeId).toBe(supervisee.id);
      expect(session?.isActive).toBe(true);
    });

    it('should return null for invalid supervision', () => {
      const tech = createMockStaff('PHARMACY_TECH');
      const pharmacist = createMockStaff('PHARMACIST');

      const session = createSupervisionSession(tech, pharmacist);
      expect(session).toBeNull();
    });

    it('should end supervision session', () => {
      const supervisor = createMockStaff('PHARMACIST');
      const supervisee = createMockStaff('PHARMACY_INTERN');
      const session = createSupervisionSession(supervisor, supervisee);

      expect(session).not.toBeNull();
      const ended = endSupervisionSession(session!);

      expect(ended.isActive).toBe(false);
      expect(ended.endedAt).toBeInstanceOf(Date);
    });

    it('should log supervised action', () => {
      const supervisor = createMockStaff('PHARMACIST');
      const supervisee = createMockStaff('PHARMACY_INTERN');
      const session = createSupervisionSession(supervisor, supervisee);

      expect(session).not.toBeNull();
      const logged = logSupervisedAction(session!, 'rx.fill');

      expect(logged.actionsSupervised).toContain('rx.fill');
    });

    it('should get supervisable roles', () => {
      const supervisable = getSupervisableRoles('PHARMACIST');

      expect(supervisable.length).toBeGreaterThan(0);
      expect(supervisable.some((r) => r.roleId === 'PHARMACY_TECH')).toBe(true);
      expect(supervisable.some((r) => r.roleId === 'PHARMACY_INTERN')).toBe(true);
    });
  });

  describe('Certification Tracking', () => {
    it('should detect certification expiring soon', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);

      expect(isCertificationExpiringSoon(soonDate, 30)).toBe(true);
      expect(isCertificationExpiringSoon(soonDate, 10)).toBe(false);
    });

    it('should get expiring certifications', () => {
      const staff = createMockStaff('PHARMACIST');
      staff.licenseExpiration = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days
      staff.immunizationCertExpiration = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days

      const expiring = getExpiringCertifications(staff, 30);

      expect(expiring.length).toBe(2);
      // Returns string array like 'Professional License', 'Immunization Certification'
      expect(expiring.some((c) => c.includes('License'))).toBe(true);
      expect(expiring.some((c) => c.includes('Immunization'))).toBe(true);
    });

    it('should not flag non-expiring certifications', () => {
      const staff = createMockStaff('PHARMACIST');
      staff.licenseExpiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      const expiring = getExpiringCertifications(staff, 30);

      expect(expiring.some((c) => c.includes('License'))).toBe(false);
    });
  });

  describe('Permission Audit', () => {
    it('should create permission audit entry', () => {
      const staff = createMockStaff('PHARMACIST');
      const result = { allowed: true };

      const audit = createPermissionAudit(staff, 'rx.verify', result, 'prescription', 'RX123456');

      expect(audit.userId).toBe(staff.userId);
      expect(audit.action).toBe('rx.verify');
      expect(audit.allowed).toBe(true);
      expect(audit.resourceId).toBe('RX123456');
      expect(audit.timestamp).toBeInstanceOf(Date);
    });

    it('should create denial audit entry', () => {
      const staff = createMockStaff('CASHIER');
      const result = { allowed: false, reason: 'Permission denied' };

      const audit = createPermissionAudit(staff, 'rx.verify', result, 'prescription');

      expect(audit.allowed).toBe(false);
      expect(audit.denialReason).toBe('Permission denied');
    });
  });

  describe('Display Formatting', () => {
    it('should format role display name', () => {
      const display = formatRoleDisplay('PHARMACIST');

      expect(display).toContain('Pharmacist');
      expect(display).toContain('(');
    });

    it('should return role ID for unknown role', () => {
      const display = formatRoleDisplay('UNKNOWN_ROLE' as PharmacyRoleId);

      expect(display).toBe('UNKNOWN_ROLE');
    });
  });

  describe('Permission Categories', () => {
    it('should get permission category', () => {
      expect(getPermissionCategory('rx.verify')).toBe('prescription');
      expect(getPermissionCategory('cs.dispense')).toBe('controlled');
      expect(getPermissionCategory('inventory.manage')).toBe('inventory');
      expect(getPermissionCategory('system.config')).toBe('system');
    });

    it('should return null for wildcard permission', () => {
      expect(getPermissionCategory('*')).toBeNull();
    });

    it('should group permissions by category', () => {
      const permissions: PharmacyPermission[] = [
        'rx.verify',
        'rx.fill',
        'cs.dispense',
        'inventory.manage',
      ];

      const grouped = groupPermissionsByCategory(permissions);

      expect(grouped.prescription).toContain('rx.verify');
      expect(grouped.prescription).toContain('rx.fill');
      expect(grouped.controlled).toContain('cs.dispense');
      expect(grouped.inventory).toContain('inventory.manage');
    });
  });

  describe('Constants', () => {
    it('should have all pharmacy roles defined', () => {
      expect(PHARMACY_ROLES.MASTER_USER).toBeDefined();
      expect(PHARMACY_ROLES.PHARMACIST).toBeDefined();
      expect(PHARMACY_ROLES.PHARMACY_TECH).toBeDefined();
      expect(PHARMACY_ROLES.CASHIER).toBeDefined();
    });

    it('should have permission descriptions', () => {
      expect(PERMISSION_DESCRIPTIONS['rx.verify']).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS['cs.dispense']).toBeDefined();
    });

    it('should have state tech ratios', () => {
      expect(STATE_TECH_RATIOS['CA']).toBe(4);
      expect(STATE_TECH_RATIOS['TX']).toBe(4);
      expect(STATE_TECH_RATIOS['NY']).toBe(4);
    });

    it('should have correct role hierarchy', () => {
      expect(PHARMACY_ROLES.MASTER_USER.level).toBe(0);
      expect(PHARMACY_ROLES.PHARMACIST.level).toBeLessThan(PHARMACY_ROLES.PHARMACY_TECH.level);
      expect(PHARMACY_ROLES.PHARMACY_TECH.level).toBeLessThan(PHARMACY_ROLES.CASHIER.level);
    });
  });

  describe('Role Properties', () => {
    it('should have supervision requirements for trainees', () => {
      expect(PHARMACY_ROLES.TECH_IN_TRAINING.requiresSupervision).toBe(true);
      expect(PHARMACY_ROLES.PHARMACY_INTERN.requiresSupervision).toBe(true);
    });

    it('should not require supervision for licensed pharmacists', () => {
      expect(PHARMACY_ROLES.PHARMACIST.requiresSupervision).toBe(false);
      expect(PHARMACY_ROLES.STAFF_PHARMACIST.requiresSupervision).toBe(false);
    });

    it('should require license for pharmacist roles', () => {
      expect(PHARMACY_ROLES.PHARMACIST.requiresLicense).toBe(true);
      expect(PHARMACY_ROLES.PHARMACY_INTERN.requiresLicense).toBe(true);
    });

    it('should not require license for support roles', () => {
      expect(PHARMACY_ROLES.CASHIER.requiresLicense).toBe(false);
      expect(PHARMACY_ROLES.DELIVERY_DRIVER.requiresLicense).toBe(false);
    });
  });

  describe('Schema Validation', () => {
    it('should validate pharmacy staff schema', () => {
      const staff = createMockStaff('PHARMACIST');

      const result = PharmacyStaffSchema.safeParse(staff);
      expect(result.success).toBe(true);
    });

    it('should validate supervision session schema', () => {
      const supervisor = createMockStaff('PHARMACIST');
      const supervisee = createMockStaff('PHARMACY_TECH');
      const session = createSupervisionSession(supervisor, supervisee);

      expect(session).not.toBeNull();
      const result = SupervisionSessionSchema.safeParse(session);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permission array', () => {
      const staff = createMockStaff('PHARMACIST');

      expect(hasAnyPermission(staff, [])).toBe(false);
      expect(hasAllPermissions(staff, [])).toBe(true);
    });

    it('should handle inactive staff', () => {
      const staff = createMockStaff('PHARMACIST');
      staff.employmentStatus = 'terminated';
      staff.isActive = false;

      // Permission check should return not allowed for inactive user
      const result = hasPermission(staff, 'rx.verify');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not active');
    });

    it('should handle staff with expired license', () => {
      const staff = createMockStaff('PHARMACIST');
      staff.licenseExpiration = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Expired
      staff.licenseActive = false;

      // Permission check should fail due to license requirement
      const result = hasPermission(staff, 'rx.verify');
      expect(result.allowed).toBe(false);
    });
  });
});

// Helper Functions
function createMockStaff(roleId: PharmacyRoleId): PharmacyStaff {
  const role = PHARMACY_ROLES[roleId];
  const now = new Date();
  return {
    id: `staff_${Math.random().toString(36).substr(2, 9)}`,
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    pharmacyId: 'pharmacy123',
    role: roleId,
    roleLevel: role?.level ?? (10 as PermissionLevel),
    firstName: 'Test',
    lastName: 'User',
    licenseNumber: roleId.includes('PHARMACIST') ? 'RPH12345' : undefined,
    licenseState: 'CA',
    licenseExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    licenseActive: true,
    deaNumber: roleId === 'PHARMACIST' ? 'BP1234567' : undefined,
    npiNumber: roleId.includes('PHARMACIST') ? '1234567890' : undefined,
    ptcbCertified: roleId.includes('TECH'),
    ptcbNumber: roleId.includes('TECH') ? 'PTCB12345' : undefined,
    ptcbExpiration: roleId.includes('TECH') ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined,
    immunizationCertified: roleId.includes('PHARMACIST'),
    immunizationCertExpiration: roleId.includes('PHARMACIST') ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined,
    blsCertified: true,
    blsCertExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    aclsCertified: false,
    aclsCertExpiration: undefined,
    requiresSupervision: role?.requiresSupervision ?? false,
    supervisorId: role?.requiresSupervision ? 'supervisor123' : undefined,
    supervisorName: role?.requiresSupervision ? 'Dr. Supervisor' : undefined,
    hireDate: new Date('2020-01-15'),
    employmentStatus: 'active',
    primaryStation: 'Station1',
    trainingCompleted: ['HIPAA', 'Safety'],
    trainingRequired: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
