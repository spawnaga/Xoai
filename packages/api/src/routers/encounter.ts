import { z } from 'zod';
import { router, protectedProcedure, clinicalProcedure, doctorProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { EncounterStatus, EncounterType } from '@xoai/db';

// Map API status values to Prisma enum
const statusMap: Record<string, EncounterStatus> = {
  'planned': 'PLANNED',
  'arrived': 'PLANNED',
  'in-progress': 'IN_PROGRESS',
  'finished': 'COMPLETED',
  'cancelled': 'CANCELLED',
};

// Map API type values to Prisma enum
const typeMap: Record<string, EncounterType> = {
  'ambulatory': 'OUTPATIENT',
  'emergency': 'EMERGENCY',
  'inpatient': 'INPATIENT',
  'observation': 'OUTPATIENT',
  'virtual': 'TELEHEALTH',
};

/**
 * Encounter Router - Patient visits and encounters
 */
export const encounterRouter = router({
  // Get all encounters for a patient
  listByPatient: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        status: z.enum(['planned', 'arrived', 'in-progress', 'finished', 'cancelled']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { patientId, limit, cursor, status } = input;

      const encounters = await ctx.db.encounter.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          patientId,
          ...(status && { status: statusMap[status] }),
        },
        orderBy: { startDate: 'desc' },
        include: {
          observations: { take: 5 },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (encounters.length > limit) {
        const nextItem = encounters.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: encounters,
        nextCursor,
      };
    }),

  // Get single encounter
  getById: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const encounter = await ctx.db.encounter.findUnique({
        where: { id: input.id },
        include: {
          patient: true,
          observations: true,
          medications: true,
        },
      });

      if (!encounter) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encounter not found',
        });
      }

      return encounter;
    }),

  // Create new encounter
  create: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        type: z.enum(['ambulatory', 'emergency', 'inpatient', 'observation', 'virtual']),
        status: z.enum(['planned', 'arrived', 'in-progress', 'finished', 'cancelled']).default('planned'),
        date: z.date(),
        reason: z.string().optional(),
        diagnosis: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify patient exists
      const patient = await ctx.db.patient.findUnique({
        where: { id: input.patientId },
      });

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      const encounter = await ctx.db.encounter.create({
        data: {
          patientId: input.patientId,
          type: typeMap[input.type] || 'OUTPATIENT',
          status: statusMap[input.status] || 'PLANNED',
          startDate: input.date,
          reason: input.reason,
          diagnosis: input.diagnosis,
          notes: input.notes,
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Encounter',
          resourceId: encounter.id,
          userId: ctx.user.id,
          details: {
            patientId: input.patientId,
            type: input.type,
          },
        },
      });

      return encounter;
    }),

  // Update encounter
  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['planned', 'arrived', 'in-progress', 'finished', 'cancelled']).optional(),
        reason: z.string().optional(),
        diagnosis: z.string().optional(),
        notes: z.string().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, ...rest } = input;

      const encounter = await ctx.db.encounter.update({
        where: { id },
        data: {
          ...(status && { status: statusMap[status] }),
          ...rest,
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'Encounter',
          resourceId: encounter.id,
          userId: ctx.user.id,
          details: { fields: Object.keys(input).filter(k => k !== 'id') },
        },
      });

      return encounter;
    }),

  // Get today's encounters
  today: clinicalProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const encounters = await ctx.db.encounter.findMany({
      where: {
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return encounters;
  }),

  // Get encounter statistics
  stats: clinicalProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const [total, byStatus, byType] = await Promise.all([
        ctx.db.encounter.count({
          where: {
            startDate: { gte: startDate, lte: endDate },
          },
        }),
        ctx.db.encounter.groupBy({
          by: ['status'],
          where: {
            startDate: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),
        ctx.db.encounter.groupBy({
          by: ['type'],
          where: {
            startDate: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),
      ]);

      return {
        total,
        byStatus: byStatus.map((s: { status: EncounterStatus; _count: number }) => ({ status: s.status, _count: s._count })),
        byType: byType.map((t: { type: EncounterType; _count: number }) => ({ type: t.type, _count: t._count })),
      };
    }),
});
