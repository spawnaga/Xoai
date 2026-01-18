import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const intakeRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
        channel: z.enum(['E_PRESCRIBE', 'FAX', 'PHONE', 'HARD_COPY', 'TRANSFER_IN', 'REFILL_REQUEST', 'EMR_INTEGRATION']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit, cursor, channel } = input;

      const items = await ctx.db.prescriptionIntake.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          ...(status && { status }),
          ...(channel && { channel }),
        },
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: typeof cursor = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.prescriptionIntake.findUnique({
        where: { id: input.id },
        include: {
          patient: true,
          prescriber: true,
        },
      });

      if (!intake) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' });
      }

      return intake;
    }),

  convertToPrescription: protectedProcedure
    .input(z.object({ intakeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.prescriptionIntake.findUnique({
        where: { id: input.intakeId },
      });

      if (!intake) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' });
      }

      if (intake.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Intake already processed' });
      }

      // Find or create patient if not linked
      let patientId = intake.patientId;
      if (!patientId) {
        const existingPatient = await ctx.db.patient.findFirst({
          where: {
            firstName: intake.patientFirstName,
            lastName: intake.patientLastName,
            dateOfBirth: intake.patientDOB,
          },
        });

        if (existingPatient) {
          patientId = existingPatient.id;
        }
      }

      // Create prescription from intake data
      const prescription = await ctx.db.prescription.create({
        data: {
          patientId,
          drugName: intake.drugName,
          drugNdc: intake.drugNDC,
          quantityWritten: intake.quantity,
          daysSupply: intake.daysSupply,
          directions: intake.directions,
          dawCode: intake.dawCode,
          refillsAuthorized: intake.refillsAuthorized,
          isControlled: intake.isControlled,
          deaSchedule: intake.schedule,
          workflowState: 'DATA_ENTRY',
          priority: 'NORMAL',
          intakeId: intake.id,
        },
      });

      await ctx.db.prescriptionIntake.update({
        where: { id: input.intakeId },
        data: { status: 'APPROVED', processedAt: new Date() },
      });

      // Create state history
      const staff = await ctx.db.pharmacyStaff.findUnique({
        where: { userId: ctx.user.id },
      });

      if (staff) {
        await ctx.db.prescriptionStateHistory.create({
          data: {
            prescriptionId: prescription.id,
            fromState: 'INTAKE',
            toState: 'DATA_ENTRY',
            changedById: staff.id,
            reason: 'Converted from intake',
          },
        });
      }

      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Prescription',
          resourceId: prescription.id,
          userId: ctx.user.id,
          details: { intakeId: input.intakeId },
        },
      });

      return prescription;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['IN_REVIEW', 'APPROVED', 'REJECTED']),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.prescriptionIntake.update({
        where: { id: input.id },
        data: {
          status: input.status,
          rejectionReason: input.rejectionReason,
          processedAt: new Date(),
        },
      });
    }),
});
