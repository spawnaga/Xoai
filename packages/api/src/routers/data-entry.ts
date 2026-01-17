import { z } from 'zod';
import { router, techLevelProcedure } from '../trpc';
import {
  validateDataEntry,
  buildSig,
  SIG_COMPONENTS,
  DAW_CODES,
  type SigComponents,
} from '@xoai/medscab/data-entry';

export const dataEntryRouter = router({
  validate: techLevelProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        prescriberId: z.string().optional(),
        drugNdc: z.string().optional(),
        quantity: z.number().optional(),
        daysSupply: z.number().optional(),
        directions: z.string().optional(),
        refills: z.number().optional(),
        dawCode: z.number().optional(),
        deaSchedule: z.number().optional(),
      })
    )
    .query(({ input }) => {
      return validateDataEntry(input);
    }),

  buildSig: techLevelProcedure
    .input(
      z.object({
        action: z.string(),
        quantity: z.string().optional(),
        form: z.string().optional(),
        route: z.string(),
        frequency: z.string(),
        timing: z.string().optional(),
        prnReason: z.string().optional(),
        duration: z.string().optional(),
        additional: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return { sig: buildSig(input as SigComponents) };
    }),

  getSigComponents: techLevelProcedure.query(() => {
    return SIG_COMPONENTS;
  }),

  getDawCodes: techLevelProcedure.query(() => {
    return DAW_CODES;
  }),
});
