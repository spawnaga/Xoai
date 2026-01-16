import type { UserRole, Permission, RolePermissions, User } from './types';

/**
 * Role-Based Access Control (RBAC) for Healthcare
 * Implements principle of least privilege
 */

// Define all resources in the system
export const RESOURCES = {
  PATIENT: 'patient',
  ENCOUNTER: 'encounter',
  OBSERVATION: 'observation',
  MEDICATION: 'medication',
  FHIR_RESOURCE: 'fhir_resource',
  AUDIT_LOG: 'audit_log',
  USER: 'user',
  SETTINGS: 'settings',
  REPORT: 'report',
  BILLING: 'billing',
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

// Define actions
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * Role permissions matrix
 * Following principle of least privilege
 */
export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'ADMIN',
    permissions: [
      { resource: RESOURCES.PATIENT, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.ENCOUNTER, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.OBSERVATION, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.MEDICATION, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.FHIR_RESOURCE, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.AUDIT_LOG, actions: ['read'] },
      { resource: RESOURCES.USER, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.SETTINGS, actions: ['create', 'read', 'update', 'delete'] },
      { resource: RESOURCES.REPORT, actions: ['create', 'read'] },
      { resource: RESOURCES.BILLING, actions: ['create', 'read', 'update', 'delete'] },
    ],
  },
  {
    role: 'DOCTOR',
    permissions: [
      { resource: RESOURCES.PATIENT, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.ENCOUNTER, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.OBSERVATION, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.MEDICATION, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.FHIR_RESOURCE, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.AUDIT_LOG, actions: ['read'] },
      { resource: RESOURCES.REPORT, actions: ['create', 'read'] },
      { resource: RESOURCES.BILLING, actions: ['read'] },
    ],
  },
  {
    role: 'NURSE',
    permissions: [
      { resource: RESOURCES.PATIENT, actions: ['read', 'update'] },
      { resource: RESOURCES.ENCOUNTER, actions: ['create', 'read', 'update'] },
      { resource: RESOURCES.OBSERVATION, actions: ['create', 'read'] },
      { resource: RESOURCES.MEDICATION, actions: ['read'] },
      { resource: RESOURCES.FHIR_RESOURCE, actions: ['read'] },
      { resource: RESOURCES.REPORT, actions: ['read'] },
    ],
  },
  {
    role: 'PATIENT',
    permissions: [
      { resource: RESOURCES.PATIENT, actions: ['read'] }, // Own record only
      { resource: RESOURCES.ENCOUNTER, actions: ['read'] }, // Own encounters
      { resource: RESOURCES.OBSERVATION, actions: ['read'] }, // Own observations
      { resource: RESOURCES.MEDICATION, actions: ['read'] }, // Own medications
      { resource: RESOURCES.FHIR_RESOURCE, actions: ['read'] }, // Own resources
    ],
  },
  {
    role: 'USER',
    permissions: [
      { resource: RESOURCES.PATIENT, actions: ['read'] },
    ],
  },
];

/**
 * Check if a role has permission for a specific action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePerms = ROLE_PERMISSIONS.find((rp) => rp.role === role);
  if (!rolePerms) return false;

  const resourcePerm = rolePerms.permissions.find((p) => p.resource === resource);
  if (!resourcePerm) return false;

  return resourcePerm.actions.includes(action);
}

/**
 * Check if a user can perform an action
 */
export function canPerform(
  user: User | null,
  resource: Resource,
  action: Action
): boolean {
  if (!user) return false;
  return hasPermission(user.role, resource, action);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const rolePerms = ROLE_PERMISSIONS.find((rp) => rp.role === role);
  return rolePerms?.permissions || [];
}

/**
 * Check if user can access a specific patient's data
 * Patients can only access their own data
 */
export function canAccessPatientData(
  user: User | null,
  patientId: string,
  action: Action
): boolean {
  if (!user) return false;

  // Patients can only access their own data
  if (user.role === 'PATIENT') {
    return user.id === patientId && hasPermission('PATIENT', RESOURCES.PATIENT, action);
  }

  // Other roles use standard permissions
  return hasPermission(user.role, RESOURCES.PATIENT, action);
}

/**
 * Authorization middleware helper
 */
export function requirePermission(resource: Resource, action: Action) {
  return (user: User | null): boolean => {
    return canPerform(user, resource, action);
  };
}

/**
 * Get accessible resources for a role
 */
export function getAccessibleResources(role: UserRole): Resource[] {
  const rolePerms = ROLE_PERMISSIONS.find((rp) => rp.role === role);
  if (!rolePerms) return [];

  return rolePerms.permissions.map((p) => p.resource as Resource);
}
