import { z } from 'zod';

export const patientInputSchema = z.object({
  id: z.string(),
  mrn: z.string(),
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
  country: z.string().optional(),
});

export const observationInputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  code: z.string(),
  codeSystem: z.string().optional(),
  display: z.string(),
  value: z.string().optional(),
  unit: z.string().optional(),
  effectiveDate: z.date(),
  status: z.enum(['registered', 'preliminary', 'final', 'amended', 'cancelled']).optional(),
});

export const encounterInputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  type: z.string(),
  status: z.enum(['planned', 'in-progress', 'finished', 'cancelled']),
  startDate: z.date(),
  endDate: z.date().optional(),
  reason: z.string().optional(),
});

export const medicationInputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  rxnormCode: z.string().optional(),
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  status: z.enum(['active', 'completed', 'stopped', 'on-hold']).optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export type PatientInput = z.infer<typeof patientInputSchema>;
export type ObservationInput = z.infer<typeof observationInputSchema>;
export type EncounterInput = z.infer<typeof encounterInputSchema>;
export type MedicationInput = z.infer<typeof medicationInputSchema>;
