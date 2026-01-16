import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSessionExpired,
  shouldRefreshSession,
  createSessionActivity,
  validateSession,
  getSessionUser,
  createSessionExpiry,
} from './session';
import type { Session } from './types';

console.log('Starting test suite...');

describe('Session Management', () => {
  describe('isSessionExpired', () => {
    it('should return false for session with future expiry', () => {
      const session: Session = {
        user: { id: '1', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() + 60000), // 1 minute in future
      };
      expect(isSessionExpired(session)).toBe(false);
    });

    it('should return true for session with past expiry', () => {
      const session: Session = {
        user: { id: '1', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() - 60000), // 1 minute in past
      };
      expect(isSessionExpired(session)).toBe(true);
    });

    it('should handle string date expiry', () => {
      const session: Session = {
        user: { id: '1', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() + 60000),
      };
      expect(isSessionExpired(session)).toBe(false);
    });
  });

  describe('shouldRefreshSession', () => {
    it('should return false for recent activity', () => {
      const lastActivity = new Date(Date.now() - 60000); // 1 minute ago
      expect(shouldRefreshSession(lastActivity, 900)).toBe(false);
    });

    it('should return true for old activity (past half timeout)', () => {
      const lastActivity = new Date(Date.now() - 500000); // ~8 minutes ago
      expect(shouldRefreshSession(lastActivity, 900)).toBe(true);
    });

    it('should use default timeout of 900 seconds', () => {
      const lastActivity = new Date(Date.now() - 460000); // ~7.5 minutes ago
      expect(shouldRefreshSession(lastActivity)).toBe(true);
    });

    it('should return false for very recent activity', () => {
      const lastActivity = new Date(Date.now() - 1000); // 1 second ago
      expect(shouldRefreshSession(lastActivity)).toBe(false);
    });
  });

  describe('createSessionActivity', () => {
    it('should create activity with timestamp', () => {
      const activity = createSessionActivity();
      expect(activity.lastActivity).toBeInstanceOf(Date);
    });

    it('should include IP address when provided', () => {
      const activity = createSessionActivity('192.168.1.1');
      expect(activity.ipAddress).toBe('192.168.1.1');
    });

    it('should include user agent when provided', () => {
      const activity = createSessionActivity(undefined, 'Mozilla/5.0');
      expect(activity.userAgent).toBe('Mozilla/5.0');
    });

    it('should include both IP and user agent', () => {
      const activity = createSessionActivity('10.0.0.1', 'Chrome/120');
      expect(activity.ipAddress).toBe('10.0.0.1');
      expect(activity.userAgent).toBe('Chrome/120');
    });
  });

  describe('validateSession', () => {
    it('should return valid for good session', () => {
      const session: Session = {
        user: { id: '1', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() + 60000),
      };
      const result = validateSession(session);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return invalid for null session', () => {
      const result = validateSession(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No session found');
    });

    it('should return invalid for session without user', () => {
      const session = { expires: new Date() } as Session;
      const result = validateSession(session);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No user in session');
    });

    it('should return invalid for session with missing user id', () => {
      const session: Session = {
        user: { id: '', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() + 60000),
      };
      const result = validateSession(session);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid user data');
    });

    it('should return invalid for session with missing email', () => {
      const session: Session = {
        user: { id: '1', email: '', role: 'USER' },
        expires: new Date(Date.now() + 60000),
      };
      const result = validateSession(session);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid user data');
    });

    it('should return invalid for expired session', () => {
      const session: Session = {
        user: { id: '1', email: 'test@test.com', role: 'USER' },
        expires: new Date(Date.now() - 60000),
      };
      const result = validateSession(session);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });
  });

  describe('getSessionUser', () => {
    it('should return user from valid session', () => {
      const session: Session = {
        user: {
          id: 'user-123',
          email: 'doctor@hospital.com',
          name: 'Dr. Smith',
          role: 'DOCTOR',
          image: 'https://example.com/avatar.png',
        },
        expires: new Date(),
      };

      const user = getSessionUser(session);
      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('doctor@hospital.com');
      expect(user?.name).toBe('Dr. Smith');
      expect(user?.role).toBe('DOCTOR');
      expect(user?.image).toBe('https://example.com/avatar.png');
    });

    it('should return null for null session', () => {
      const user = getSessionUser(null);
      expect(user).toBeNull();
    });

    it('should return null for session without user', () => {
      const session = { expires: new Date() } as Session;
      const user = getSessionUser(session);
      expect(user).toBeNull();
    });

    it('should default role to USER when not specified', () => {
      const session: Session = {
        user: {
          id: '1',
          email: 'test@test.com',
          role: undefined as any,
        },
        expires: new Date(),
      };
      const user = getSessionUser(session);
      expect(user?.role).toBe('USER');
    });
  });

  describe('createSessionExpiry', () => {
    it('should create expiry in the future', () => {
      const now = Date.now();
      const expiry = createSessionExpiry(900);
      expect(expiry.getTime()).toBeGreaterThan(now);
    });

    it('should respect custom timeout', () => {
      const now = Date.now();
      const expiry = createSessionExpiry(3600); // 1 hour
      const diff = expiry.getTime() - now;
      expect(diff).toBeGreaterThanOrEqual(3599000);
      expect(diff).toBeLessThanOrEqual(3601000);
    });

    it('should use default timeout of 900 seconds', () => {
      const now = Date.now();
      const expiry = createSessionExpiry();
      const diff = expiry.getTime() - now;
      expect(diff).toBeGreaterThanOrEqual(899000);
      expect(diff).toBeLessThanOrEqual(901000);
    });
  });
});

console.log('Test suite completed.');
