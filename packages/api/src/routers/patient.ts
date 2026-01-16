import { z } from 'zod';
import { router, protectedProcedure, clinicalProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Gender } from '@xoai/db';

// Map API gender values to Prisma enum
const genderMap: Record<string, Gender> = {
  'male': 'MALE',
  'female': 'FEMALE',
  'other': 'OTHER',
  'unknown': 'UNKNOWN',
};

/**
 * Patient Router - CRUD operations for patient records
 */
export const patientRouter = router({
  // Get all patients (paginated)
  list: clinicalProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search } = input;

      const patients = await ctx.db.patient.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { mrn: { contains: search } },
              ],
            }
          : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: typeof cursor = undefined;
      if (patients.length > limit) {
        const nextItem = patients.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: patients,
        nextCursor,
      };
    }),

  // Get single patient by ID
  getById: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await ctx.db.patient.findUnique({
        where: { id: input.id },
        include: {
          encounters: { take: 10, orderBy: { startDate: 'desc' } },
          observations: { take: 10, orderBy: { effectiveDate: 'desc' } },
        },
      });

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      return patient;
    }),

  // Create new patient
  create: clinicalProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.date(),
        gender: z.enum(['male', 'female', 'other', 'unknown']),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insurancePolicyNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate MRN
      const mrn = `MRN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const { gender, ...rest } = input;

      const patient = await ctx.db.patient.create({
        data: {
          ...rest,
          gender: genderMap[gender] || 'UNKNOWN',
          mrn,
          createdBy: ctx.user.id,
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Patient',
          resourceId: patient.id,
          userId: ctx.user.id,
          details: { mrn: patient.mrn },
        },
      });

      return patient;
    }),

  // Update patient
  update: clinicalProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.date().optional(),
        gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insurancePolicyNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, gender, ...rest } = input;

      const patient = await ctx.db.patient.update({
        where: { id },
        data: {
          ...rest,
          ...(gender && { gender: genderMap[gender] }),
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'Patient',
          resourceId: patient.id,
          userId: ctx.user.id,
          details: { fields: Object.keys(input).filter(k => k !== 'id') },
        },
      });

      return patient;
    }),

  // Delete patient (hard delete - be careful)
  delete: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // In production, consider soft delete by adding an 'active' field to the schema
      await ctx.db.patient.delete({
        where: { id: input.id },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'DELETE',
          resourceType: 'Patient',
          resourceId: input.id,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),

  // Search patients
  search: clinicalProcedure
    .input(
      z.object({
        query: z.string().min(2),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const patients = await ctx.db.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: input.query } },
            { lastName: { contains: input.query } },
            { mrn: { contains: input.query } },
            { email: { contains: input.query } },
          ],
        },
        take: input.limit,
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      });

      return patients;
    }),
});
