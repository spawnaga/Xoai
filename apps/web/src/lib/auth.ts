import { getServerSession, type NextAuthOptions } from 'next-auth';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@xoai/db';

/**
 * HIPAA-Compliant Server-Side Authentication Utilities
 *
 * These utilities provide server-side session management for:
 * - Server Components (RSC)
 * - Server Actions
 * - API Routes
 *
 * Compliance: HIPAA Security Rule § 164.312(d) - Person or Entity Authentication
 */

// Session type with extended user properties
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: string;
  isSuperuser: boolean;
  isDoctor: boolean;
  isPharmacist: boolean;
  isPharmacyTechnician: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

/**
 * Get current session (cached per request)
 * Use this in Server Components and Server Actions
 *
 * @returns Session or null if not authenticated
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  // Get raw session from NextAuth
  const session = await getServerSession();

  if (!session?.user) {
    return null;
  }

  // Map to our AuthSession type with extended properties from JWT
  return {
    user: {
      id: (session.user as Record<string, unknown>).id as string || '',
      username: (session.user as Record<string, unknown>).username as string || '',
      email: session.user.email || '',
      name: session.user.name || null,
      role: (session.user as Record<string, unknown>).role as string || 'USER',
      isSuperuser: (session.user as Record<string, unknown>).isSuperuser as boolean || false,
      isDoctor: (session.user as Record<string, unknown>).isDoctor as boolean || false,
      isPharmacist: (session.user as Record<string, unknown>).isPharmacist as boolean || false,
      isPharmacyTechnician: (session.user as Record<string, unknown>).isPharmacyTechnician as boolean || false,
    },
    expires: session.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
});

/**
 * Get current session or redirect to login
 * Use this in protected Server Components
 *
 * @param redirectTo - Path to redirect after login (default: current page)
 * @returns Session (never null - redirects if not authenticated)
 */
export async function requireSession(redirectTo?: string): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    const loginUrl = redirectTo
      ? `/login?callbackUrl=${encodeURIComponent(redirectTo)}`
      : '/login';
    redirect(loginUrl);
  }

  return session;
}

/**
 * Get current user or redirect to login
 * Convenience wrapper for requireSession
 *
 * @returns AuthUser (never null - redirects if not authenticated)
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await requireSession();
  return session.user;
}

/**
 * Check if current user has specific role
 *
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles
 */
export async function hasRole(allowedRoles: string[]): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  return allowedRoles.includes(session.user.role);
}

/**
 * Require specific role or redirect to unauthorized
 *
 * @param allowedRoles - Array of allowed roles
 * @param redirectTo - Path to redirect if unauthorized (default: /dashboard)
 */
export async function requireRole(
  allowedRoles: string[],
  redirectTo: string = '/dashboard'
): Promise<AuthSession> {
  const session = await requireSession();

  if (!allowedRoles.includes(session.user.role) && !session.user.isSuperuser) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Check if user can access patient data (HIPAA minimum necessary)
 *
 * @param patientId - Patient ID to check access for
 * @returns true if user can access this patient's data
 */
export async function canAccessPatient(patientId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  // Superusers have full access
  if (session.user.isSuperuser) return true;

  // Check if user is assigned to this patient or has appropriate role
  // This would typically check a user-patient assignment table
  // For now, doctors and nurses can access all patients
  if (session.user.isDoctor || session.user.role === 'NURSE') {
    return true;
  }

  return false;
}

/**
 * Log PHI access for HIPAA audit trail
 *
 * @param action - Action performed (VIEW, CREATE, UPDATE, DELETE)
 * @param resourceType - Type of resource (Patient, Encounter, etc.)
 * @param resourceId - ID of the resource
 * @param details - Additional details for the audit log
 */
export async function logPHIAccess(
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT',
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const session = await getSession();
  if (!session) return;

  // Map action to AuditAction enum values
  const actionMap = {
    VIEW: 'PHI_VIEW',
    CREATE: 'PHI_CREATE',
    UPDATE: 'PHI_UPDATE',
    DELETE: 'PHI_DELETE',
    EXPORT: 'PHI_EXPORT',
  } as const;

  try {
    // Verify user exists before creating audit log to avoid FK constraint errors
    const userExists = session.user.id ? await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    }) : null;

    await db.auditLog.create({
      data: {
        action: actionMap[action] as 'PHI_VIEW' | 'PHI_CREATE' | 'PHI_UPDATE' | 'PHI_DELETE' | 'PHI_EXPORT',
        resourceType,
        resourceId,
        userId: userExists ? session.user.id : null,
        details: {
          ...details,
          userName: session.user.name,
          userRole: session.user.role,
          sessionUserId: session.user.id,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Session timeout configuration (HIPAA requirement)
 * Values based on compliance research:
 * - Clinical workstations: 5-15 minutes
 * - Mobile apps: 2-3 minutes
 * - Web apps: max 8-12 hours absolute
 */
export const SESSION_CONFIG = {
  // Idle timeout in seconds (15 minutes for clinical use)
  IDLE_TIMEOUT: 15 * 60,

  // Absolute session lifetime in seconds (8 hours)
  MAX_SESSION_AGE: 8 * 60 * 60,

  // Token refresh interval in seconds (5 minutes)
  REFRESH_INTERVAL: 5 * 60,

  // Warning before timeout in seconds (2 minutes)
  TIMEOUT_WARNING: 2 * 60,
};
