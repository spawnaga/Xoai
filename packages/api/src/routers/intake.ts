import { z } from 'zod';
import { router, protectedProcedure, techLevelProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const intakeRouter = router({
  list: techLevelProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit, cursor } = input;

      const items = await ctx.db.prescriptionIntake.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: status ? { status } : undefined,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
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

  getById: techLevelProcedure
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

  convertToPrescription: techLevelProcedure
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

      const prescription = await ctx.db.prescription.create({
        data: {
          patientId: intake.patientId,
          prescriberId: intake.prescriberId,
          drugName: intake.drugName,
          strength: intake.strength,
          dosageForm: intake.dosageForm,
          quantity: intake.quantity,
          daysSupply: intake.daysSupply,
          refills: intake.refills,
          sig: intake.sig,
          writtenDate: intake.writtenDate,
          status: 'PENDING',
          createdBy: ctx.user.id,
        },
      });

      await ctx.db.prescriptionIntake.update({
        where: { id: input.intakeId },
        data: { status: 'APPROVED', processedAt: new Date() },
      });

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

  updateStatus: techLevelProcedure
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
