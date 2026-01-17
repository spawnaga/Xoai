import { z } from 'zod';
import { router, pharmacistProcedure } from '../trpc';
import {
  generateQueryId,
  createPDMPResult,
  analyzePDMPResults as analyzeResults,
  type PDMPQuery,
  type PDMPPrescription,
} from '@xoai/medscab';

export const pdmpRouter = router({
  query: pharmacistProcedure
    .input(
      z.object({
        patientFirstName: z.string(),
        patientLastName: z.string(),
        patientDOB: z.date(),
        patientState: z.string().length(2),
        pharmacyDEA: z.string(),
        pharmacyNPI: z.string(),
        requestReason: z.enum(['dispensing', 'review', 'audit', 'clinical']),
        prescriptionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mockPrescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          drugName: 'Hydrocodone-Acetaminophen 5-325mg',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234563',
          pharmacyName: 'Main Pharmacy',
          pharmacyDEA: 'FM1234567',
          paymentType: 'insurance',
        },
      ];

      const result = createPDMPResult(
        input as PDMPQuery,
        mockPrescriptions,
        {
          provider: 'bamboo_health',
          source: 'state',
          statesQueried: [input.patientState],
          statesResponded: [input.patientState],
          patientMatched: true,
          matchConfidence: 95,
          responseTimeMs: 1200,
          historyMonths: 12,
        }
      );

      await ctx.db.auditLog.create({
        data: {
          action: 'READ',
          resourceType: 'PDMP_QUERY',
          resourceId: result.queryId,
          userId: ctx.user.id,
          details: {
            patientName: `${input.patientFirstName} ${input.patientLastName}`,
            state: input.patientState,
            riskLevel: result.riskLevel,
            alertCount: result.alertCount,
          },
        },
      });

      return result;
    }),

  acknowledge: pharmacistProcedure
    .input(
      z.object({
        queryId: z.string(),
        decision: z.enum(['approve', 'deny', 'investigate']),
        notes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'PDMP_REVIEW',
          resourceId: input.queryId,
          userId: ctx.user.id,
          details: {
            decision: input.decision,
            notes: input.notes,
          },
        },
      });

      return { success: true };
    }),
});
