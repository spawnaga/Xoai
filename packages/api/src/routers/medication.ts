import { z } from 'zod';
import { router, clinicalProcedure, doctorProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { MedicationStatus } from '@xoai/db';

// Map API status values to Prisma enum
const statusMap: Record<string, MedicationStatus> = {
  'active': 'ACTIVE',
  'completed': 'COMPLETED',
  'stopped': 'STOPPED',
  'on-hold': 'ON_HOLD',
  'cancelled': 'STOPPED',
};

/**
 * Medication Router - Prescriptions and medication orders
 */
export const medicationRouter = router({
  // Get medications for a patient
  listByPatient: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        status: z.enum(['active', 'completed', 'stopped', 'on-hold', 'cancelled']).optional(),
        activeOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { patientId, limit, cursor, status, activeOnly } = input;

      const medications = await ctx.db.medication.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          patientId,
          ...(status && { status: statusMap[status] }),
          ...(activeOnly && { status: 'ACTIVE' }),
        },
        orderBy: { startDate: 'desc' },
      });

      let nextCursor: typeof cursor = undefined;
      if (medications.length > limit) {
        const nextItem = medications.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: medications,
        nextCursor,
      };
    }),

  // Get single medication
  getById: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const medication = await ctx.db.medication.findUnique({
        where: { id: input.id },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
          encounter: true,
        },
      });

      if (!medication) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Medication not found',
        });
      }

      return medication;
    }),

  // Prescribe medication (doctor only)
  prescribe: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        encounterId: z.string().optional(),
        rxnormCode: z.string().optional(),
        ndcCode: z.string().optional(),
        name: z.string(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        startDate: z.date().default(() => new Date()),
        endDate: z.date().optional(),
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

      const medication = await ctx.db.medication.create({
        data: {
          patientId: input.patientId,
          encounterId: input.encounterId,
          rxnormCode: input.rxnormCode,
          ndcCode: input.ndcCode,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          route: input.route,
          startDate: input.startDate,
          endDate: input.endDate,
          prescribedBy: ctx.user.id,
          status: 'ACTIVE',
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Medication',
          resourceId: medication.id,
          userId: ctx.user.id,
          details: {
            patientId: input.patientId,
            medication: input.name,
          },
        },
      });

      return medication;
    }),

  // Update medication status
  updateStatus: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['active', 'completed', 'stopped', 'on-hold', 'cancelled']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status } = input;

      const medication = await ctx.db.medication.update({
        where: { id },
        data: {
          status: statusMap[status],
          ...(status === 'completed' || status === 'stopped' ? { endDate: new Date() } : {}),
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'Medication',
          resourceId: medication.id,
          userId: ctx.user.id,
          details: { status },
        },
      });

      return medication;
    }),

  // Renew prescription
  renew: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, endDate } = input;

      // Get original medication
      const original = await ctx.db.medication.findUnique({
        where: { id },
      });

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Medication not found',
        });
      }

      // Create new prescription based on original
      const medication = await ctx.db.medication.create({
        data: {
          patientId: original.patientId,
          encounterId: original.encounterId,
          rxnormCode: original.rxnormCode,
          ndcCode: original.ndcCode,
          name: original.name,
          dosage: original.dosage,
          frequency: original.frequency,
          route: original.route,
          startDate: new Date(),
          endDate: endDate,
          prescribedBy: ctx.user.id,
          status: 'ACTIVE',
        },
      });

      // Mark original as completed
      await ctx.db.medication.update({
        where: { id },
        data: { status: 'COMPLETED', endDate: new Date() },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Medication',
          resourceId: medication.id,
          userId: ctx.user.id,
          details: {
            type: 'renewal',
            priorMedicationId: id,
          },
        },
      });

      return medication;
    }),

  // Get active medications count
  activeCount: clinicalProcedure
    .input(z.object({ patientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.medication.count({
        where: {
          patientId: input.patientId,
          status: 'ACTIVE',
        },
      });

      return { count };
    }),

  // Check drug interactions (placeholder - would integrate with AI package)
  checkInteractions: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        newMedicationCode: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get patient's active medications
      const activeMeds = await ctx.db.medication.findMany({
        where: {
          patientId: input.patientId,
          status: 'ACTIVE',
        },
        select: {
          rxnormCode: true,
          name: true,
        },
      });

      // In a real implementation, this would call the AI package
      // or a drug interaction database
      return {
        checkedAgainst: activeMeds.length,
        interactions: [],
        warnings: [],
      };
    }),
});
