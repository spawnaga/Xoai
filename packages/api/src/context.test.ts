import { describe, it, expect } from 'vitest';
import { createContext } from './context';
import type { Context, Session } from './context';

describe('API Context', () => {
  describe('createContext', () => {
    it('should create context with db and null session by default', async () => {
      const context = await createContext();

      expect(context).toBeDefined();
      expect(context.db).toBeDefined();
      expect(context.session).toBeNull();
    });

    it('should return Context type', async () => {
      const context = await createContext();

      expect(context).toHaveProperty('db');
      expect(context).toHaveProperty('session');
    });
  });

  describe('Context type', () => {
    it('should support database and session', () => {
      const mockSession: Session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
        },
        expires: new Date('2024-12-31'),
      };

      const context: Context = {
        db: null as any,
        session: mockSession,
      };

      expect(context.session?.user.id).toBe('user-123');
      expect(context.session?.user.email).toBe('test@example.com');
    });

    it('should support null session', () => {
      const context: Context = {
        db: null as any,
        session: null,
      };

      expect(context.session).toBeNull();
    });
  });

  describe('Session type', () => {
    it('should have required user fields', () => {
      const session: Session = {
        user: {
          id: 'user-456',
          email: 'doctor@hospital.com',
          role: 'DOCTOR',
        },
        expires: new Date(),
      };

      expect(session.user.id).toBeDefined();
      expect(session.user.email).toBeDefined();
      expect(session.user.role).toBeDefined();
    });

    it('should support optional name', () => {
      const sessionWithName: Session = {
        user: {
          id: 'user-789',
          email: 'nurse@hospital.com',
          name: 'Jane Nurse',
          role: 'NURSE',
        },
        expires: new Date(),
      };

      const sessionWithoutName: Session = {
        user: {
          id: 'user-101',
          email: 'admin@hospital.com',
          role: 'ADMIN',
        },
        expires: new Date(),
      };

      expect(sessionWithName.user.name).toBe('Jane Nurse');
      expect(sessionWithoutName.user.name).toBeUndefined();
    });
  });
});
