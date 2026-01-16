/**
 * Pharmacy Role-Based Access Control (RBAC) Module
 *
 * Provides role management and permission checking for pharmacy operations:
 * - 10 permission levels (0 = highest, 10 = lowest)
 * - Role-based permissions for pharmacy staff
 * - Supervision requirements for trainees
 * - State-specific scope restrictions
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Permission level (0 = highest, 10 = lowest)
 */
export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Pharmacy role identifiers
 */
export type PharmacyRoleId =
  | 'MASTER_USER'
  | 'SYSTEM_ADMIN'
  | 'COMPUTER_TECH'
  | 'PHARMACIST'
  | 'PHARMACY_MANAGER'
  | 'STAFF_PHARMACIST'
  | 'PHARMACY_INTERN'
  | 'PHARMACY_TECH_LEAD'
  | 'PHARMACY_TECH'
  | 'TECH_IN_TRAINING'
  | 'CASHIER'
  | 'DELIVERY_DRIVER';

/**
 * Permission categories
 */
export type PermissionCategory =
  | 'prescription'
  | 'verification'
  | 'counseling'
  | 'clinical'
  | 'immunization'
  | 'inventory'
  | 'controlled'
  | 'pos'
  | 'supervision'
  | 'system'
  | 'reports'
  | 'audit';

/**
 * Pharmacy permission
 */
export type PharmacyPermission =
  | '*' // All permissions (master user)
  // Prescription operations
  | 'rx.view'
  | 'rx.create'
  | 'rx.data_entry'
  | 'rx.data_entry_supervised'
  | 'rx.fill'
  | 'rx.fill_supervised'
  | 'rx.label'
  | 'rx.transfer_in'
  | 'rx.transfer_out'
  | 'rx.refill'
  | 'rx.discontinue'
  | 'rx.cancel'
  // Verification
  | 'rx.verify'
  | 'rx.verify_supervised'
  | 'rx.final_verify'
  | 'rx.override_dur'
  | 'rx.override_interaction'
  // Counseling
  | 'rx.counsel'
  | 'rx.counsel_supervised'
  | 'rx.decline_counseling'
  // Clinical
  | 'clinical.mtm'
  | 'clinical.immunization'
  | 'clinical.immunization_supervised'
  | 'clinical.screening'
  | 'clinical.point_of_care'
  | 'pdmp.query'
  | 'pdmp.view'
  // Controlled substances
  | 'cs.dispense'
  | 'cs.order'
  | 'cs.receive'
  | 'cs.count'
  | 'cs.adjust'
  | 'cs.report'
  | 'cs.sign_dea222'
  | 'cs.csos_order'
  // Inventory
  | 'inventory.view'
  | 'inventory.manage'
  | 'inventory.receive'
  | 'inventory.adjust'
  | 'inventory.order'
  | 'inventory.return'
  | 'inventory.count'
  | 'inventory.count_controlled'
  // Point of Sale
  | 'pos.operate'
  | 'pos.refund'
  | 'pos.void'
  | 'pos.discount'
  | 'pos.price_override'
  | 'pickup.process'
  | 'signature.capture'
  // Supervision
  | 'supervision.intern'
  | 'supervision.tech'
  | 'supervision.trainee'
  | 'supervision.approve'
  // System administration
  | 'system.config'
  | 'system.users'
  | 'system.roles'
  | 'system.logs'
  | 'system.backup'
  | 'system.integration'
  // Reports
  | 'reports.view'
  | 'reports.create'
  | 'reports.schedule'
  | 'reports.financial'
  | 'reports.clinical'
  | 'reports.compliance'
  // Audit
  | 'audit.view'
  | 'audit.export'
  | 'audit.review';

/**
 * Pharmacy role definition
 */
export interface PharmacyRole {
  roleId: PharmacyRoleId;
  roleName: string;
  abbreviation: string;
  level: PermissionLevel;
  description: string;
  permissions: PharmacyPermission[];
  requiresSupervision: boolean;
  canSupervise: PermissionLevel[]; // Levels this role can supervise
  maxTechRatio?: number; // State-specific tech supervision ratio
  requiresLicense: boolean;
  licenseTypes?: string[];
  stateRestrictions?: string[];
}

/**
 * Staff member with pharmacy role
 */
export interface PharmacyStaff {
  id: string;
  userId: string;
  pharmacyId: string;
  role: PharmacyRoleId;
  roleLevel: PermissionLevel;

  // Professional credentials
  firstName: string;
  lastName: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: Date;
  licenseActive: boolean;
  deaNumber?: string;
  npiNumber?: string;

  // Certifications
  ptcbCertified: boolean;
  ptcbNumber?: string;
  ptcbExpiration?: Date;
  immunizationCertified: boolean;
  immunizationCertExpiration?: Date;
  blsCertified: boolean;
  blsCertExpiration?: Date;
  aclsCertified: boolean;
  aclsCertExpiration?: Date;

  // Supervision
  requiresSupervision: boolean;
  supervisorId?: string;
  supervisorName?: string;

  // Employment
  hireDate: Date;
  employmentStatus: 'active' | 'inactive' | 'terminated' | 'leave';
  primaryStation?: string;

  // Training
  trainingCompleted: string[];
  trainingRequired: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresSupervision?: boolean;
  supervisorRequired?: boolean;
  restrictions?: string[];
}

/**
 * Supervision session
 */
export interface SupervisionSession {
  id: string;
  supervisorId: string;
  supervisorRole: PharmacyRoleId;
  superviseeId: string;
  superviseeRole: PharmacyRoleId;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
  actionsSupervised: string[];
}

/**
 * Action audit entry for RBAC
 */
export interface RBACActionAudit {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: PharmacyRoleId;
  action: PharmacyPermission;
  resourceType: string;
  resourceId?: string;
  allowed: boolean;
  denialReason?: string;
  supervisorId?: string;
  supervisorRole?: PharmacyRoleId;
  ipAddress?: string;
  stationId?: string;
}

// ============================================
// SCHEMAS
// ============================================

export const PharmacyStaffSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pharmacyId: z.string(),
  role: z.enum([
    'MASTER_USER',
    'SYSTEM_ADMIN',
    'COMPUTER_TECH',
    'PHARMACIST',
    'PHARMACY_MANAGER',
    'STAFF_PHARMACIST',
    'PHARMACY_INTERN',
    'PHARMACY_TECH_LEAD',
    'PHARMACY_TECH',
    'TECH_IN_TRAINING',
    'CASHIER',
    'DELIVERY_DRIVER',
  ]),
  roleLevel: z.number().min(0).max(10),
  firstName: z.string(),
  lastName: z.string(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().length(2).optional(),
  licenseExpiration: z.date().optional(),
  licenseActive: z.boolean(),
  deaNumber: z.string().optional(),
  npiNumber: z.string().length(10).optional(),
  ptcbCertified: z.boolean(),
  immunizationCertified: z.boolean(),
  blsCertified: z.boolean(),
  aclsCertified: z.boolean(),
  requiresSupervision: z.boolean(),
  supervisorId: z.string().optional(),
  hireDate: z.date(),
  employmentStatus: z.enum(['active', 'inactive', 'terminated', 'leave']),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SupervisionSessionSchema = z.object({
  id: z.string(),
  supervisorId: z.string(),
  supervisorRole: z.string(),
  superviseeId: z.string(),
  superviseeRole: z.string(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  isActive: z.boolean(),
  actionsSupervised: z.array(z.string()),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Pharmacy roles with their permissions
 */
export const PHARMACY_ROLES: Record<PharmacyRoleId, PharmacyRole> = {
  MASTER_USER: {
    roleId: 'MASTER_USER',
    roleName: 'Master User',
    abbreviation: 'MU',
    level: 0,
    description: 'Full system access, all permissions including system administration',
    permissions: ['*'],
    requiresSupervision: false,
    canSupervise: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    requiresLicense: false,
  },
  SYSTEM_ADMIN: {
    roleId: 'SYSTEM_ADMIN',
    roleName: 'System Administrator',
    abbreviation: 'SA',
    level: 1,
    description: 'System configuration and user management',
    permissions: [
      'system.config',
      'system.users',
      'system.roles',
      'system.logs',
      'system.backup',
      'system.integration',
      'reports.view',
      'reports.create',
      'audit.view',
      'audit.export',
    ],
    requiresSupervision: false,
    canSupervise: [],
    requiresLicense: false,
  },
  COMPUTER_TECH: {
    roleId: 'COMPUTER_TECH',
    roleName: 'Computer Technician',
    abbreviation: 'CT',
    level: 2,
    description: 'System maintenance and technical support',
    permissions: [
      'system.config',
      'system.logs',
      'system.backup',
      'reports.view',
    ],
    requiresSupervision: false,
    canSupervise: [],
    requiresLicense: false,
  },
  PHARMACY_MANAGER: {
    roleId: 'PHARMACY_MANAGER',
    roleName: 'Pharmacy Manager (PIC)',
    abbreviation: 'PIC',
    level: 3,
    description:
      'Pharmacist-in-Charge with full clinical and administrative permissions',
    permissions: [
      'rx.view',
      'rx.create',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.transfer_in',
      'rx.transfer_out',
      'rx.refill',
      'rx.discontinue',
      'rx.cancel',
      'rx.verify',
      'rx.final_verify',
      'rx.override_dur',
      'rx.override_interaction',
      'rx.counsel',
      'rx.decline_counseling',
      'clinical.mtm',
      'clinical.immunization',
      'clinical.screening',
      'clinical.point_of_care',
      'pdmp.query',
      'pdmp.view',
      'cs.dispense',
      'cs.order',
      'cs.receive',
      'cs.count',
      'cs.adjust',
      'cs.report',
      'cs.sign_dea222',
      'cs.csos_order',
      'inventory.view',
      'inventory.manage',
      'inventory.receive',
      'inventory.adjust',
      'inventory.order',
      'inventory.return',
      'inventory.count',
      'inventory.count_controlled',
      'pos.operate',
      'pos.refund',
      'pos.void',
      'pos.discount',
      'pos.price_override',
      'pickup.process',
      'signature.capture',
      'supervision.intern',
      'supervision.tech',
      'supervision.trainee',
      'supervision.approve',
      'system.users',
      'reports.view',
      'reports.create',
      'reports.schedule',
      'reports.financial',
      'reports.clinical',
      'reports.compliance',
      'audit.view',
      'audit.review',
    ],
    requiresSupervision: false,
    canSupervise: [4, 5, 6, 7, 8, 9, 10],
    requiresLicense: true,
    licenseTypes: ['RPH', 'PHARMD'],
  },
  PHARMACIST: {
    roleId: 'PHARMACIST',
    roleName: 'Pharmacist (RPH/PharmD)',
    abbreviation: 'RPH',
    level: 4,
    description: 'Full clinical permissions, verification, DUR override',
    permissions: [
      'rx.view',
      'rx.create',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.transfer_in',
      'rx.transfer_out',
      'rx.refill',
      'rx.discontinue',
      'rx.cancel',
      'rx.verify',
      'rx.final_verify',
      'rx.override_dur',
      'rx.override_interaction',
      'rx.counsel',
      'rx.decline_counseling',
      'clinical.mtm',
      'clinical.immunization',
      'clinical.screening',
      'clinical.point_of_care',
      'pdmp.query',
      'pdmp.view',
      'cs.dispense',
      'cs.order',
      'cs.receive',
      'cs.count',
      'cs.adjust',
      'inventory.view',
      'inventory.manage',
      'inventory.receive',
      'inventory.adjust',
      'inventory.count',
      'inventory.count_controlled',
      'pos.operate',
      'pos.refund',
      'pos.void',
      'pickup.process',
      'signature.capture',
      'supervision.intern',
      'supervision.tech',
      'supervision.trainee',
      'reports.view',
      'reports.clinical',
    ],
    requiresSupervision: false,
    canSupervise: [5, 6, 7, 8, 9, 10],
    maxTechRatio: 4, // Default, varies by state
    requiresLicense: true,
    licenseTypes: ['RPH', 'PHARMD'],
  },
  STAFF_PHARMACIST: {
    roleId: 'STAFF_PHARMACIST',
    roleName: 'Staff Pharmacist',
    abbreviation: 'RPH',
    level: 4,
    description: 'Staff pharmacist with standard clinical permissions',
    permissions: [
      'rx.view',
      'rx.create',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.transfer_in',
      'rx.transfer_out',
      'rx.refill',
      'rx.verify',
      'rx.final_verify',
      'rx.override_dur',
      'rx.override_interaction',
      'rx.counsel',
      'rx.decline_counseling',
      'clinical.immunization',
      'pdmp.query',
      'pdmp.view',
      'cs.dispense',
      'cs.receive',
      'cs.count',
      'inventory.view',
      'inventory.receive',
      'inventory.count',
      'inventory.count_controlled',
      'pos.operate',
      'pickup.process',
      'signature.capture',
      'supervision.intern',
      'supervision.tech',
      'supervision.trainee',
    ],
    requiresSupervision: false,
    canSupervise: [5, 6, 7, 8, 9, 10],
    maxTechRatio: 4,
    requiresLicense: true,
    licenseTypes: ['RPH', 'PHARMD'],
  },
  PHARMACY_INTERN: {
    roleId: 'PHARMACY_INTERN',
    roleName: 'Pharmacy Intern',
    abbreviation: 'INT',
    level: 5,
    description: 'Pharmacy student - requires DIRECT pharmacist supervision',
    permissions: [
      'rx.view',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.verify_supervised',
      'rx.counsel_supervised',
      'clinical.immunization_supervised',
      'pdmp.view',
      'inventory.view',
      'inventory.receive',
      'pos.operate',
      'pickup.process',
      'signature.capture',
    ],
    requiresSupervision: true,
    canSupervise: [],
    requiresLicense: true,
    licenseTypes: ['INTERN'],
  },
  PHARMACY_TECH_LEAD: {
    roleId: 'PHARMACY_TECH_LEAD',
    roleName: 'Pharmacy Technician Lead',
    abbreviation: 'TL',
    level: 6,
    description: 'Lead technician with additional responsibilities',
    permissions: [
      'rx.view',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.refill',
      'inventory.view',
      'inventory.manage',
      'inventory.receive',
      'inventory.adjust',
      'inventory.order',
      'inventory.count',
      'pos.operate',
      'pos.refund',
      'pickup.process',
      'signature.capture',
      'supervision.trainee',
      'reports.view',
    ],
    requiresSupervision: false,
    canSupervise: [7, 10],
    requiresLicense: true,
    licenseTypes: ['CPHT', 'TECH'],
  },
  PHARMACY_TECH: {
    roleId: 'PHARMACY_TECH',
    roleName: 'Pharmacy Technician (Certified)',
    abbreviation: 'CPHT',
    level: 7,
    description: 'Certified pharmacy technician',
    permissions: [
      'rx.view',
      'rx.data_entry',
      'rx.fill',
      'rx.label',
      'rx.refill',
      'inventory.view',
      'inventory.manage',
      'inventory.receive',
      'inventory.count',
      'pos.operate',
      'pickup.process',
      'signature.capture',
    ],
    requiresSupervision: false,
    canSupervise: [8, 10],
    requiresLicense: true,
    licenseTypes: ['CPHT', 'TECH'],
  },
  TECH_IN_TRAINING: {
    roleId: 'TECH_IN_TRAINING',
    roleName: 'Pharmacy Tech in Training',
    abbreviation: 'TIT',
    level: 8,
    description: 'Technician trainee - requires certified tech or pharmacist supervision',
    permissions: [
      'rx.view',
      'rx.data_entry_supervised',
      'rx.fill_supervised',
      'rx.label',
      'inventory.view',
      'pos.operate',
      'pickup.process',
      'signature.capture',
    ],
    requiresSupervision: true,
    canSupervise: [],
    requiresLicense: false,
  },
  CASHIER: {
    roleId: 'CASHIER',
    roleName: 'Cashier',
    abbreviation: 'CSH',
    level: 10,
    description: 'Point of sale operations only',
    permissions: [
      'rx.view',
      'pos.operate',
      'pickup.process',
      'signature.capture',
    ],
    requiresSupervision: false,
    canSupervise: [],
    requiresLicense: false,
  },
  DELIVERY_DRIVER: {
    roleId: 'DELIVERY_DRIVER',
    roleName: 'Delivery Driver',
    abbreviation: 'DRV',
    level: 10,
    description: 'Medication delivery personnel',
    permissions: [
      'rx.view',
      'pickup.process',
      'signature.capture',
    ],
    requiresSupervision: false,
    canSupervise: [],
    requiresLicense: false,
  },
};

/**
 * Permission descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<PharmacyPermission, string> = {
  '*': 'All permissions (master user)',
  // Prescription
  'rx.view': 'View prescription details',
  'rx.create': 'Create new prescriptions',
  'rx.data_entry': 'Enter prescription data',
  'rx.data_entry_supervised': 'Enter prescription data (supervised)',
  'rx.fill': 'Fill prescriptions',
  'rx.fill_supervised': 'Fill prescriptions (supervised)',
  'rx.label': 'Print prescription labels',
  'rx.transfer_in': 'Process incoming transfers',
  'rx.transfer_out': 'Process outgoing transfers',
  'rx.refill': 'Process refill requests',
  'rx.discontinue': 'Discontinue prescriptions',
  'rx.cancel': 'Cancel prescriptions',
  // Verification
  'rx.verify': 'Verify filled prescriptions',
  'rx.verify_supervised': 'Verify prescriptions (supervised)',
  'rx.final_verify': 'Final verification',
  'rx.override_dur': 'Override DUR alerts',
  'rx.override_interaction': 'Override drug interactions',
  // Counseling
  'rx.counsel': 'Provide patient counseling',
  'rx.counsel_supervised': 'Provide counseling (supervised)',
  'rx.decline_counseling': 'Document declined counseling',
  // Clinical
  'clinical.mtm': 'Medication therapy management',
  'clinical.immunization': 'Administer immunizations',
  'clinical.immunization_supervised': 'Administer immunizations (supervised)',
  'clinical.screening': 'Health screenings',
  'clinical.point_of_care': 'Point of care testing',
  'pdmp.query': 'Query PDMP database',
  'pdmp.view': 'View PDMP results',
  // Controlled substances
  'cs.dispense': 'Dispense controlled substances',
  'cs.order': 'Order controlled substances',
  'cs.receive': 'Receive controlled substances',
  'cs.count': 'Count controlled substances',
  'cs.adjust': 'Adjust controlled substance inventory',
  'cs.report': 'Generate controlled substance reports',
  'cs.sign_dea222': 'Sign DEA 222 forms',
  'cs.csos_order': 'Place CSOS orders',
  // Inventory
  'inventory.view': 'View inventory',
  'inventory.manage': 'Manage inventory',
  'inventory.receive': 'Receive inventory',
  'inventory.adjust': 'Adjust inventory',
  'inventory.order': 'Order inventory',
  'inventory.return': 'Process returns',
  'inventory.count': 'Physical inventory count',
  'inventory.count_controlled': 'Count controlled substance inventory',
  // POS
  'pos.operate': 'Operate point of sale',
  'pos.refund': 'Process refunds',
  'pos.void': 'Void transactions',
  'pos.discount': 'Apply discounts',
  'pos.price_override': 'Override prices',
  'pickup.process': 'Process prescription pickups',
  'signature.capture': 'Capture patient signatures',
  // Supervision
  'supervision.intern': 'Supervise interns',
  'supervision.tech': 'Supervise technicians',
  'supervision.trainee': 'Supervise trainees',
  'supervision.approve': 'Approve supervised actions',
  // System
  'system.config': 'System configuration',
  'system.users': 'User management',
  'system.roles': 'Role management',
  'system.logs': 'View system logs',
  'system.backup': 'System backup',
  'system.integration': 'Integration management',
  // Reports
  'reports.view': 'View reports',
  'reports.create': 'Create reports',
  'reports.schedule': 'Schedule reports',
  'reports.financial': 'Financial reports',
  'reports.clinical': 'Clinical reports',
  'reports.compliance': 'Compliance reports',
  // Audit
  'audit.view': 'View audit logs',
  'audit.export': 'Export audit logs',
  'audit.review': 'Review audit findings',
};

/**
 * State-specific technician ratios
 */
export const STATE_TECH_RATIOS: Record<string, number> = {
  AL: 3,
  AK: 4,
  AZ: 4,
  AR: 3,
  CA: 4,
  CO: 4,
  CT: 3,
  DE: 4,
  FL: 3,
  GA: 4,
  HI: 4,
  ID: 4,
  IL: 4,
  IN: 4,
  IA: 4,
  KS: 4,
  KY: 3,
  LA: 3,
  ME: 4,
  MD: 4,
  MA: 4,
  MI: 5,
  MN: 4,
  MS: 3,
  MO: 4,
  MT: 3,
  NE: 4,
  NV: 4,
  NH: 4,
  NJ: 4,
  NM: 3,
  NY: 4,
  NC: 4,
  ND: 4,
  OH: 4,
  OK: 3,
  OR: 4,
  PA: 4,
  RI: 3,
  SC: 4,
  SD: 4,
  TN: 4,
  TX: 4,
  UT: 4,
  VT: 4,
  VA: 4,
  WA: 4,
  WV: 3,
  WI: 4,
  WY: 4,
  DC: 4,
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Get role by ID
 */
export function getRole(roleId: PharmacyRoleId): PharmacyRole | undefined {
  return PHARMACY_ROLES[roleId];
}

/**
 * Get all roles
 */
export function getAllRoles(): PharmacyRole[] {
  return Object.values(PHARMACY_ROLES);
}

/**
 * Get roles by permission level
 */
export function getRolesByLevel(level: PermissionLevel): PharmacyRole[] {
  return Object.values(PHARMACY_ROLES).filter((role) => role.level === level);
}

/**
 * Get roles that have a specific permission
 */
export function getRolesWithPermission(permission: PharmacyPermission): PharmacyRole[] {
  return Object.values(PHARMACY_ROLES).filter(
    (role) =>
      role.permissions.includes('*') || role.permissions.includes(permission)
  );
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  roleId: PharmacyRoleId,
  permission: PharmacyPermission
): boolean {
  const role = PHARMACY_ROLES[roleId];
  if (!role) return false;

  return role.permissions.includes('*') || role.permissions.includes(permission);
}

/**
 * Check if user has permission
 */
export function hasPermission(
  staff: PharmacyStaff,
  permission: PharmacyPermission,
  supervisor?: PharmacyStaff
): PermissionCheckResult {
  const role = PHARMACY_ROLES[staff.role];
  if (!role) {
    return { allowed: false, reason: 'Invalid role' };
  }

  // Check if user is active
  if (!staff.isActive || staff.employmentStatus !== 'active') {
    return { allowed: false, reason: 'User is not active' };
  }

  // Check license requirements
  if (role.requiresLicense && !staff.licenseActive) {
    return { allowed: false, reason: 'License is not active' };
  }

  // Check if license is expired
  if (staff.licenseExpiration && staff.licenseExpiration < new Date()) {
    return { allowed: false, reason: 'License has expired' };
  }

  // Check if role has permission
  const hasBasicPermission =
    role.permissions.includes('*') || role.permissions.includes(permission);

  // Check for supervised permission
  const supervisedPermission = `${permission}_supervised` as PharmacyPermission;
  const hasSupervisedPermission = role.permissions.includes(supervisedPermission);

  if (!hasBasicPermission && !hasSupervisedPermission) {
    return {
      allowed: false,
      reason: `Role ${role.roleName} does not have permission: ${permission}`,
    };
  }

  // Check if supervision is required
  if (hasSupervisedPermission && !hasBasicPermission) {
    if (!supervisor) {
      return {
        allowed: false,
        reason: 'This action requires supervision',
        requiresSupervision: true,
        supervisorRequired: true,
      };
    }

    // Validate supervisor
    const supervisorRole = PHARMACY_ROLES[supervisor.role];
    if (!supervisorRole) {
      return { allowed: false, reason: 'Invalid supervisor role' };
    }

    // Check if supervisor can supervise this role
    if (!supervisorRole.canSupervise.includes(role.level)) {
      return {
        allowed: false,
        reason: `${supervisorRole.roleName} cannot supervise ${role.roleName}`,
      };
    }

    // Check if supervisor has the base permission
    if (
      !supervisorRole.permissions.includes('*') &&
      !supervisorRole.permissions.includes(permission)
    ) {
      return {
        allowed: false,
        reason: `Supervisor does not have permission: ${permission}`,
      };
    }

    // Check if supervisor is active
    if (!supervisor.isActive || supervisor.employmentStatus !== 'active') {
      return { allowed: false, reason: 'Supervisor is not active' };
    }

    return {
      allowed: true,
      requiresSupervision: true,
    };
  }

  // Check if general supervision is required
  if (role.requiresSupervision && !supervisor) {
    return {
      allowed: false,
      reason: 'This role requires supervision for all actions',
      requiresSupervision: true,
      supervisorRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if staff can supervise another staff member
 */
export function canSupervise(
  supervisor: PharmacyStaff,
  supervisee: PharmacyStaff
): boolean {
  const supervisorRole = PHARMACY_ROLES[supervisor.role];
  const superviseeRole = PHARMACY_ROLES[supervisee.role];

  if (!supervisorRole || !superviseeRole) return false;

  return supervisorRole.canSupervise.includes(superviseeRole.level);
}

/**
 * Get technician ratio for state
 */
export function getTechRatio(state: string): number {
  return STATE_TECH_RATIOS[state.toUpperCase()] || 4; // Default to 4
}

/**
 * Check if pharmacist is within tech ratio limits
 */
export function isWithinTechRatio(
  pharmacistCount: number,
  techCount: number,
  state: string
): { compliant: boolean; maxTechs: number; currentRatio: number } {
  const maxRatio = getTechRatio(state);
  const maxTechs = pharmacistCount * maxRatio;
  const currentRatio = pharmacistCount > 0 ? techCount / pharmacistCount : techCount;

  return {
    compliant: techCount <= maxTechs,
    maxTechs,
    currentRatio,
  };
}

/**
 * Create a supervision session
 */
export function createSupervisionSession(
  supervisor: PharmacyStaff,
  supervisee: PharmacyStaff
): SupervisionSession | null {
  if (!canSupervise(supervisor, supervisee)) {
    return null;
  }

  return {
    id: `SUP-${Date.now().toString(36)}`.toUpperCase(),
    supervisorId: supervisor.id,
    supervisorRole: supervisor.role,
    superviseeId: supervisee.id,
    superviseeRole: supervisee.role,
    startedAt: new Date(),
    isActive: true,
    actionsSupervised: [],
  };
}

/**
 * End a supervision session
 */
export function endSupervisionSession(session: SupervisionSession): SupervisionSession {
  return {
    ...session,
    endedAt: new Date(),
    isActive: false,
  };
}

/**
 * Log supervised action
 */
export function logSupervisedAction(
  session: SupervisionSession,
  action: PharmacyPermission
): SupervisionSession {
  return {
    ...session,
    actionsSupervised: [...session.actionsSupervised, action],
  };
}

/**
 * Create audit entry for permission check
 */
export function createPermissionAudit(
  staff: PharmacyStaff,
  permission: PharmacyPermission,
  result: PermissionCheckResult,
  resourceType: string,
  resourceId?: string,
  supervisor?: PharmacyStaff
): RBACActionAudit {
  return {
    id: `RBAC-${Date.now().toString(36)}`.toUpperCase(),
    timestamp: new Date(),
    userId: staff.userId,
    userRole: staff.role,
    action: permission,
    resourceType,
    resourceId,
    allowed: result.allowed,
    denialReason: result.reason,
    supervisorId: supervisor?.id,
    supervisorRole: supervisor?.role,
  };
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(roleId: PharmacyRoleId): PharmacyPermission[] {
  const role = PHARMACY_ROLES[roleId];
  return role ? [...role.permissions] : [];
}

/**
 * Get effective permissions (including master user expansion)
 */
export function getEffectivePermissions(
  staff: PharmacyStaff
): PharmacyPermission[] {
  const role = PHARMACY_ROLES[staff.role];
  if (!role) return [];

  if (role.permissions.includes('*')) {
    // Return all possible permissions except '*'
    return Object.keys(PERMISSION_DESCRIPTIONS).filter(
      (p) => p !== '*'
    ) as PharmacyPermission[];
  }

  return [...role.permissions];
}

/**
 * Check if staff has any of the given permissions
 */
export function hasAnyPermission(
  staff: PharmacyStaff,
  permissions: PharmacyPermission[]
): boolean {
  const role = PHARMACY_ROLES[staff.role];
  if (!role) return false;

  if (role.permissions.includes('*')) return true;

  return permissions.some((p) => role.permissions.includes(p));
}

/**
 * Check if staff has all of the given permissions
 */
export function hasAllPermissions(
  staff: PharmacyStaff,
  permissions: PharmacyPermission[]
): boolean {
  const role = PHARMACY_ROLES[staff.role];
  if (!role) return false;

  if (role.permissions.includes('*')) return true;

  return permissions.every((p) => role.permissions.includes(p));
}

/**
 * Get roles that can be supervised by a given role
 */
export function getSupervisableRoles(supervisorRoleId: PharmacyRoleId): PharmacyRole[] {
  const supervisorRole = PHARMACY_ROLES[supervisorRoleId];
  if (!supervisorRole) return [];

  return Object.values(PHARMACY_ROLES).filter((role) =>
    supervisorRole.canSupervise.includes(role.level)
  );
}

/**
 * Check if certification is expiring soon
 */
export function isCertificationExpiringSoon(
  expirationDate: Date | undefined,
  daysThreshold: number = 90
): boolean {
  if (!expirationDate) return false;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return expirationDate <= thresholdDate;
}

/**
 * Get expiring certifications for staff
 */
export function getExpiringCertifications(
  staff: PharmacyStaff,
  daysThreshold: number = 90
): string[] {
  const expiring: string[] = [];

  if (isCertificationExpiringSoon(staff.licenseExpiration, daysThreshold)) {
    expiring.push('Professional License');
  }
  if (isCertificationExpiringSoon(staff.ptcbExpiration, daysThreshold)) {
    expiring.push('PTCB Certification');
  }
  if (isCertificationExpiringSoon(staff.immunizationCertExpiration, daysThreshold)) {
    expiring.push('Immunization Certification');
  }
  if (isCertificationExpiringSoon(staff.blsCertExpiration, daysThreshold)) {
    expiring.push('BLS Certification');
  }
  if (isCertificationExpiringSoon(staff.aclsCertExpiration, daysThreshold)) {
    expiring.push('ACLS Certification');
  }

  return expiring;
}

/**
 * Format role for display
 */
export function formatRoleDisplay(roleId: PharmacyRoleId): string {
  const role = PHARMACY_ROLES[roleId];
  return role ? `${role.roleName} (${role.abbreviation})` : roleId;
}

/**
 * Get permission category
 */
export function getPermissionCategory(
  permission: PharmacyPermission
): PermissionCategory | null {
  if (permission === '*') return null;

  const parts = permission.split('.');
  const prefix = parts[0];
  if (!prefix) return null;

  const categoryMap: Record<string, PermissionCategory> = {
    rx: 'prescription',
    clinical: 'clinical',
    pdmp: 'clinical',
    cs: 'controlled',
    inventory: 'inventory',
    pos: 'pos',
    pickup: 'pos',
    signature: 'pos',
    supervision: 'supervision',
    system: 'system',
    reports: 'reports',
    audit: 'audit',
  };

  return categoryMap[prefix] ?? null;
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory(
  permissions: PharmacyPermission[]
): Record<PermissionCategory | 'other', PharmacyPermission[]> {
  const grouped: Record<PermissionCategory | 'other', PharmacyPermission[]> = {
    prescription: [],
    verification: [],
    counseling: [],
    clinical: [],
    immunization: [],
    inventory: [],
    controlled: [],
    pos: [],
    supervision: [],
    system: [],
    reports: [],
    audit: [],
    other: [],
  };

  for (const permission of permissions) {
    const category = getPermissionCategory(permission);
    if (category) {
      grouped[category].push(permission);
    } else {
      grouped.other.push(permission);
    }
  }

  return grouped;
}
