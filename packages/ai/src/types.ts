import { z } from 'zod';

// Base AI Configuration
export interface AIConfig {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Medical AI Query Types
export interface MedicalAIQuery {
  patientContext?: string;
  symptoms?: string[];
  medications?: string[];
  allergies?: string[];
  query: string;
}

export interface DrugInteractionResult {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  recommendation: string;
}

// Patient Context for AI Analysis
export interface PatientContext {
  age?: number;
  gender?: string;
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
  comorbidities?: string[];
}

// Clinical Encounter for SOAP Notes
export interface ClinicalEncounter {
  subjective: string;
  objective: {
    vitals?: Record<string, string | number>;
    physicalExam?: string;
    labResults?: Record<string, string | number>;
  };
  assessment?: string;
  plan?: string;
}

// Zod Validation Schemas
export const AIMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const MedicalAIQuerySchema = z.object({
  patientContext: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  query: z.string().min(1),
});

export const DrugInteractionResultSchema = z.object({
  drug1: z.string(),
  drug2: z.string(),
  severity: z.enum(['minor', 'moderate', 'major', 'contraindicated']),
  description: z.string(),
  recommendation: z.string(),
});

export const PatientContextSchema = z.object({
  age: z.number().positive().optional(),
  gender: z.string().optional(),
  medicalHistory: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  comorbidities: z.array(z.string()).optional(),
});

export const ClinicalEncounterSchema = z.object({
  subjective: z.string().min(1),
  objective: z.object({
    vitals: z.record(z.union([z.string(), z.number()])).optional(),
    physicalExam: z.string().optional(),
    labResults: z.record(z.union([z.string(), z.number()])).optional(),
  }),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

// Utility function to validate inputs
export function validateMedicalQuery(query: unknown): MedicalAIQuery {
  return MedicalAIQuerySchema.parse(query);
}

export function validatePatientContext(context: unknown): PatientContext {
  return PatientContextSchema.parse(context);
}

export function validateClinicalEncounter(encounter: unknown): ClinicalEncounter {
  return ClinicalEncounterSchema.parse(encounter);
}
