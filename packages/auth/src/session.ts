import type { Session, User } from './types';

/**
 * HIPAA-compliant session management
 */

export interface SessionActivity {
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

/**
 * Check if session is expired based on HIPAA timeout
 */
export function isSessionExpired(session: Session, maxAgeSeconds: number = 900): boolean {
  const now = new Date();
  const expires = new Date(session.expires);
  return now > expires;
}

/**
 * Check if session needs refresh (activity-based)
 */
export function shouldRefreshSession(
  lastActivity: Date,
  inactivityTimeoutSeconds: number = 900
): boolean {
  const now = new Date();
  const timeSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000;
  return timeSinceActivity > inactivityTimeoutSeconds / 2;
}

/**
 * Create session activity record for audit
 */
export function createSessionActivity(
  ipAddress?: string,
  userAgent?: string
): SessionActivity {
  return {
    lastActivity: new Date(),
    ipAddress,
    userAgent,
  };
}

/**
 * Validate session for HIPAA compliance
 */
export function validateSession(session: Session | null): {
  valid: boolean;
  reason?: string;
} {
  if (!session) {
    return { valid: false, reason: 'No session found' };
  }

  if (!session.user) {
    return { valid: false, reason: 'No user in session' };
  }

  if (!session.user.id || !session.user.email) {
    return { valid: false, reason: 'Invalid user data' };
  }

  if (isSessionExpired(session)) {
    return { valid: false, reason: 'Session expired' };
  }

  return { valid: true };
}

/**
 * Get session user with default values
 */
export function getSessionUser(session: Session | null): User | null {
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role || 'USER',
    image: session.user.image,
  };
}

/**
 * Create a new session expiry date
 */
export function createSessionExpiry(maxAgeSeconds: number = 900): Date {
  return new Date(Date.now() + maxAgeSeconds * 1000);
}
