import { describe, it, expect, vi } from 'vitest';

// Mock Prisma client for testing
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    patient: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    encounter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    observation: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    medication: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    fhirResource: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

describe('Database Package', () => {
  describe('Prisma Client', () => {
    it('should export db instance', async () => {
      const { db } = await import('./index');
      expect(db).toBeDefined();
    });

    it('should export prisma alias', async () => {
      const { prisma } = await import('./index');
      expect(prisma).toBeDefined();
    });

    it('should be singleton in development', async () => {
      const { db: db1 } = await import('./index');
      const { db: db2 } = await import('./index');
      expect(db1).toBe(db2);
    });
  });

  describe('Model exports', () => {
    it('should have user model', async () => {
      const { db } = await import('./index');
      expect(db.user).toBeDefined();
    });

    it('should have patient model', async () => {
      const { db } = await import('./index');
      expect(db.patient).toBeDefined();
    });

    it('should have encounter model', async () => {
      const { db } = await import('./index');
      expect(db.encounter).toBeDefined();
    });

    it('should have observation model', async () => {
      const { db } = await import('./index');
      expect(db.observation).toBeDefined();
    });

    it('should have medication model', async () => {
      const { db } = await import('./index');
      expect(db.medication).toBeDefined();
    });

    it('should have fhirResource model', async () => {
      const { db } = await import('./index');
      expect(db.fhirResource).toBeDefined();
    });

    it('should have auditLog model', async () => {
      const { db } = await import('./index');
      expect(db.auditLog).toBeDefined();
    });
  });

  describe('CRUD operations', () => {
    it('should support patient findMany', async () => {
      const { db } = await import('./index');
      expect(db.patient.findMany).toBeDefined();
      expect(typeof db.patient.findMany).toBe('function');
    });

    it('should support patient create', async () => {
      const { db } = await import('./index');
      expect(db.patient.create).toBeDefined();
      expect(typeof db.patient.create).toBe('function');
    });

    it('should support auditLog create', async () => {
      const { db } = await import('./index');
      expect(db.auditLog.create).toBeDefined();
      expect(typeof db.auditLog.create).toBe('function');
    });
  });
});
