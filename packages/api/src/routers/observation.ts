import { z } from 'zod';
import { router, clinicalProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Observation Router - Clinical observations and vitals
 */
export const observationRouter = router({
  // Get observations for a patient
  listByPatient: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        code: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { patientId, limit, cursor, code } = input;

      const observations = await ctx.db.observation.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          patientId,
          ...(code && { code }),
        },
        orderBy: { effectiveDate: 'desc' },
      });

      let nextCursor: typeof cursor = undefined;
      if (observations.length > limit) {
        const nextItem = observations.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: observations,
        nextCursor,
      };
    }),

  // Get single observation
  getById: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const observation = await ctx.db.observation.findUnique({
        where: { id: input.id },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
          encounter: true,
        },
      });

      if (!observation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Observation not found',
        });
      }

      return observation;
    }),

  // Create new observation
  create: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        encounterId: z.string().optional(),
        code: z.string(),
        codeSystem: z.string().default('http://loinc.org'),
        display: z.string(),
        value: z.string().optional(),
        unit: z.string().optional(),
        interpretation: z.string().optional(),
        effectiveDate: z.date().default(() => new Date()),
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

      const observation = await ctx.db.observation.create({
        data: {
          patientId: input.patientId,
          encounterId: input.encounterId,
          code: input.code,
          codeSystem: input.codeSystem,
          display: input.display,
          value: input.value,
          unit: input.unit,
          interpretation: input.interpretation,
          effectiveDate: input.effectiveDate,
          status: 'FINAL',
        },
      });

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Observation',
          resourceId: observation.id,
          userId: ctx.user.id,
          details: {
            patientId: input.patientId,
            code: input.code,
          },
        },
      });

      return observation;
    }),

  // Record vital signs (batch)
  recordVitals: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        encounterId: z.string().optional(),
        vitals: z.object({
          bloodPressureSystolic: z.number().optional(),
          bloodPressureDiastolic: z.number().optional(),
          heartRate: z.number().optional(),
          respiratoryRate: z.number().optional(),
          temperature: z.number().optional(),
          oxygenSaturation: z.number().optional(),
          weight: z.number().optional(),
          height: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId, encounterId, vitals } = input;
      const effectiveDate = new Date();
      const observations = [];

      const vitalDefinitions = [
        { key: 'bloodPressureSystolic', code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg' },
        { key: 'bloodPressureDiastolic', code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg' },
        { key: 'heartRate', code: '8867-4', display: 'Heart rate', unit: '/min' },
        { key: 'respiratoryRate', code: '9279-1', display: 'Respiratory rate', unit: '/min' },
        { key: 'temperature', code: '8310-5', display: 'Body temperature', unit: 'Cel' },
        { key: 'oxygenSaturation', code: '2708-6', display: 'Oxygen saturation', unit: '%' },
        { key: 'weight', code: '29463-7', display: 'Body weight', unit: 'kg' },
        { key: 'height', code: '8302-2', display: 'Body height', unit: 'cm' },
      ] as const;

      for (const def of vitalDefinitions) {
        const value = vitals[def.key as keyof typeof vitals];
        if (value !== undefined) {
          const obs = await ctx.db.observation.create({
            data: {
              patientId,
              encounterId,
              code: def.code,
              codeSystem: 'http://loinc.org',
              display: def.display,
              value: String(value),
              unit: def.unit,
              effectiveDate,
              status: 'FINAL',
            },
          });
          observations.push(obs);
        }
      }

      // Log audit event
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Observation',
          resourceId: observations.map((o) => o.id).join(','),
          userId: ctx.user.id,
          details: {
            patientId,
            type: 'vitals',
            count: observations.length,
          },
        },
      });

      return observations;
    }),

  // Get latest vitals for a patient
  latestVitals: clinicalProcedure
    .input(z.object({ patientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const vitalCodes = ['8480-6', '8462-4', '8867-4', '9279-1', '8310-5', '2708-6', '29463-7', '8302-2'];

      const vitals = await ctx.db.observation.findMany({
        where: {
          patientId: input.patientId,
          code: { in: vitalCodes },
        },
        orderBy: { effectiveDate: 'desc' },
        distinct: ['code'],
      });

      return vitals;
    }),

  // Get observation trends
  trends: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        code: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { patientId, code, startDate, endDate } = input;

      const observations = await ctx.db.observation.findMany({
        where: {
          patientId,
          code,
          effectiveDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { effectiveDate: 'asc' },
        select: {
          id: true,
          effectiveDate: true,
          value: true,
          unit: true,
          interpretation: true,
        },
      });

      return observations;
    }),
});
