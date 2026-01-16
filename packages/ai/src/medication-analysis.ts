/**
 * AI-Powered Medication Analysis
 *
 * Provides intelligent medication recommendations, analysis, and clinical
 * decision support using AI models (Gemini or OpenAI).
 */

import { z } from 'zod';
import type { AIResponse } from './types';

// ============================================
// TYPES
// ============================================

export interface MedicationAnalysisInput {
  patientId: string;
  drugName: string;
  indication: string;
  patientAge?: number;
  patientGender?: string;
  patientWeight?: number;
  medicalConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  labResults?: Record<string, number | string>;
  renalFunction?: {
    creatinine?: number;
    creatinineClearance?: number;
    eGFR?: number;
  };
  hepaticFunction?: {
    alt?: number;
    ast?: number;
    bilirubin?: number;
    childPughScore?: string;
  };
}

export interface MedicationAnalysisResult {
  dosageRecommendation: {
    startingDose: string;
    maintenanceDose: string;
    maxDose: string;
    frequency: string;
    route: string;
    duration?: string;
  };
  icd10Suggestions: Array<{
    code: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  drugInteractions: Array<{
    drug: string;
    severity: 'high' | 'moderate' | 'low';
    description: string;
    recommendation: string;
  }>;
  contraindications: Array<{
    condition: string;
    severity: 'high' | 'moderate' | 'low';
    description: string;
  }>;
  monitoringRequirements: Array<{
    parameter: string;
    frequency: string;
    rationale: string;
  }>;
  patientEducation: string[];
  clinicalNotes: string;
  confidence: {
    overall: number;
    breakdown: {
      dosing: number;
      interactions: number;
      contraindications: number;
    };
  };
  disclaimer: string;
}

export interface TreatmentRecommendation {
  medicationName: string;
  brandName?: string;
  strength: string;
  dosageForm: string;
  route: string;
  instructions: string;
  sig: string;
  quantity: number;
  daysSupply: number;
  refills: number;
  drugClass: string;
  medicationCategory: 'PRESCRIPTION' | 'CONTROLLED' | 'LEGEND' | 'OTC';
  deaSchedule?: 'II' | 'III' | 'IV' | 'V';
  confidence: {
    score: number;
    breakdown: {
      efficacy: number;
      safety: number;
      patientFactors: number;
    };
  };
  rationale: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  monitoringParameters: string[];
  patientCounseling: string[];
  costConsiderations?: string;
}

export interface TreatmentRecommendationsResult {
  recommendations: TreatmentRecommendation[];
  clinicalContext: string;
  differentialConsiderations: string[];
  nonPharmacologicOptions: string[];
  followUpRecommendations: string[];
  disclaimer: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const MedicationAnalysisInputSchema = z.object({
  patientId: z.string(),
  drugName: z.string().min(1),
  indication: z.string().min(1),
  patientAge: z.number().positive().optional(),
  patientGender: z.string().optional(),
  patientWeight: z.number().positive().optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  labResults: z.record(z.union([z.number(), z.string()])).optional(),
  renalFunction: z.object({
    creatinine: z.number().optional(),
    creatinineClearance: z.number().optional(),
    eGFR: z.number().optional(),
  }).optional(),
  hepaticFunction: z.object({
    alt: z.number().optional(),
    ast: z.number().optional(),
    bilirubin: z.number().optional(),
    childPughScore: z.string().optional(),
  }).optional(),
});

// ============================================
// PROMPT BUILDERS
// ============================================

/**
 * Build prompt for medication analysis
 */
export function buildMedicationAnalysisPrompt(input: MedicationAnalysisInput): string {
  const parts: string[] = [
    'You are a clinical pharmacist AI assistant. Analyze the following medication request and provide comprehensive clinical guidance.',
    '',
    'IMPORTANT: This analysis is for clinical decision support only. Final prescribing decisions must be made by a licensed healthcare provider.',
    '',
    'Respond in the following JSON format:',
    '{',
    '  "dosageRecommendation": {',
    '    "startingDose": "dose with units",',
    '    "maintenanceDose": "dose with units",',
    '    "maxDose": "maximum daily dose",',
    '    "frequency": "dosing frequency",',
    '    "route": "route of administration",',
    '    "duration": "treatment duration if applicable"',
    '  },',
    '  "icd10Suggestions": [{"code": "ICD-10 code", "description": "condition", "confidence": "high|medium|low"}],',
    '  "drugInteractions": [{"drug": "name", "severity": "high|moderate|low", "description": "details", "recommendation": "action"}],',
    '  "contraindications": [{"condition": "name", "severity": "high|moderate|low", "description": "details"}],',
    '  "monitoringRequirements": [{"parameter": "what to monitor", "frequency": "how often", "rationale": "why"}],',
    '  "patientEducation": ["point 1", "point 2"],',
    '  "clinicalNotes": "additional clinical considerations",',
    '  "confidence": {"overall": 0.0-1.0, "breakdown": {"dosing": 0.0-1.0, "interactions": 0.0-1.0, "contraindications": 0.0-1.0}}',
    '}',
    '',
    '--- CLINICAL REQUEST ---',
    '',
    `Medication: ${input.drugName}`,
    `Indication: ${input.indication}`,
    '',
  ];

  // Patient demographics
  if (input.patientAge || input.patientGender || input.patientWeight) {
    parts.push('Patient Demographics:');
    if (input.patientAge) parts.push(`  Age: ${input.patientAge} years`);
    if (input.patientGender) parts.push(`  Gender: ${input.patientGender}`);
    if (input.patientWeight) parts.push(`  Weight: ${input.patientWeight} kg`);
    parts.push('');
  }

  // Medical conditions
  if (input.medicalConditions?.length) {
    parts.push(`Medical Conditions: ${input.medicalConditions.join(', ')}`);
    parts.push('');
  }

  // Allergies
  if (input.allergies?.length) {
    parts.push(`Allergies: ${input.allergies.join(', ')}`);
    parts.push('');
  }

  // Current medications
  if (input.currentMedications?.length) {
    parts.push(`Current Medications: ${input.currentMedications.join(', ')}`);
    parts.push('');
  }

  // Lab results
  if (input.labResults && Object.keys(input.labResults).length > 0) {
    parts.push('Lab Results:');
    for (const [key, value] of Object.entries(input.labResults)) {
      parts.push(`  ${key}: ${value}`);
    }
    parts.push('');
  }

  // Renal function
  if (input.renalFunction) {
    parts.push('Renal Function:');
    if (input.renalFunction.creatinine) parts.push(`  Creatinine: ${input.renalFunction.creatinine} mg/dL`);
    if (input.renalFunction.creatinineClearance) parts.push(`  CrCl: ${input.renalFunction.creatinineClearance} mL/min`);
    if (input.renalFunction.eGFR) parts.push(`  eGFR: ${input.renalFunction.eGFR} mL/min/1.73m²`);
    parts.push('');
  }

  // Hepatic function
  if (input.hepaticFunction) {
    parts.push('Hepatic Function:');
    if (input.hepaticFunction.alt) parts.push(`  ALT: ${input.hepaticFunction.alt} U/L`);
    if (input.hepaticFunction.ast) parts.push(`  AST: ${input.hepaticFunction.ast} U/L`);
    if (input.hepaticFunction.bilirubin) parts.push(`  Bilirubin: ${input.hepaticFunction.bilirubin} mg/dL`);
    if (input.hepaticFunction.childPughScore) parts.push(`  Child-Pugh: ${input.hepaticFunction.childPughScore}`);
    parts.push('');
  }

  parts.push('Please provide your clinical analysis in the specified JSON format.');

  return parts.join('\n');
}

/**
 * Build prompt for treatment recommendations
 */
export function buildTreatmentRecommendationsPrompt(
  indication: string,
  patientContext: {
    age?: number;
    gender?: string;
    weight?: number;
    medicalConditions?: string[];
    allergies?: string[];
    currentMedications?: string[];
    preferences?: string[];
  }
): string {
  const parts: string[] = [
    'You are a clinical pharmacist AI assistant. Based on the following patient presentation, provide comprehensive treatment recommendations.',
    '',
    'IMPORTANT: These recommendations are for clinical decision support only. Final treatment decisions must be made by a licensed healthcare provider.',
    '',
    'Provide 6-8 treatment options across these categories:',
    '- PRESCRIPTION MEDICATIONS (first-line options)',
    '- CONTROLLED SUBSTANCES (only when clinically indicated)',
    '- LEGEND DRUGS (prescription required)',
    '- OVER-THE-COUNTER (OTC) options',
    '',
    'Respond in the following JSON format:',
    '{',
    '  "recommendations": [',
    '    {',
    '      "medicationName": "generic name",',
    '      "brandName": "brand name",',
    '      "strength": "dose with units",',
    '      "dosageForm": "tablet/capsule/etc",',
    '      "route": "oral/topical/etc",',
    '      "instructions": "detailed instructions",',
    '      "sig": "prescription directions",',
    '      "quantity": number,',
    '      "daysSupply": number,',
    '      "refills": number,',
    '      "drugClass": "pharmacological class",',
    '      "medicationCategory": "PRESCRIPTION|CONTROLLED|LEGEND|OTC",',
    '      "deaSchedule": "II|III|IV|V (if controlled)",',
    '      "confidence": {"score": 0.0-1.0, "breakdown": {"efficacy": 0.0-1.0, "safety": 0.0-1.0, "patientFactors": 0.0-1.0}},',
    '      "rationale": "why this medication",',
    '      "evidenceLevel": "A|B|C|D",',
    '      "contraindications": ["list"],',
    '      "sideEffects": ["common side effects"],',
    '      "interactions": ["drug interactions to note"],',
    '      "monitoringParameters": ["what to monitor"],',
    '      "patientCounseling": ["counseling points"],',
    '      "costConsiderations": "cost info if relevant"',
    '    }',
    '  ],',
    '  "clinicalContext": "summary of clinical reasoning",',
    '  "differentialConsiderations": ["other diagnoses to consider"],',
    '  "nonPharmacologicOptions": ["non-drug treatments"],',
    '  "followUpRecommendations": ["follow-up guidance"]',
    '}',
    '',
    '--- CLINICAL PRESENTATION ---',
    '',
    `Indication/Diagnosis: ${indication}`,
    '',
  ];

  // Patient context
  if (patientContext.age || patientContext.gender || patientContext.weight) {
    parts.push('Patient Demographics:');
    if (patientContext.age) parts.push(`  Age: ${patientContext.age} years`);
    if (patientContext.gender) parts.push(`  Gender: ${patientContext.gender}`);
    if (patientContext.weight) parts.push(`  Weight: ${patientContext.weight} kg`);
    parts.push('');
  }

  if (patientContext.medicalConditions?.length) {
    parts.push(`Medical Conditions: ${patientContext.medicalConditions.join(', ')}`);
    parts.push('');
  }

  if (patientContext.allergies?.length) {
    parts.push(`Allergies: ${patientContext.allergies.join(', ')}`);
    parts.push('');
  }

  if (patientContext.currentMedications?.length) {
    parts.push(`Current Medications: ${patientContext.currentMedications.join(', ')}`);
    parts.push('');
  }

  if (patientContext.preferences?.length) {
    parts.push(`Patient Preferences: ${patientContext.preferences.join(', ')}`);
    parts.push('');
  }

  parts.push('Please provide your treatment recommendations in the specified JSON format.');

  return parts.join('\n');
}

// ============================================
// RESPONSE PARSERS
// ============================================

/**
 * Parse medication analysis response
 */
export function parseMedicationAnalysisResponse(response: AIResponse): MedicationAnalysisResult {
  const defaultResult: MedicationAnalysisResult = {
    dosageRecommendation: {
      startingDose: 'See prescribing information',
      maintenanceDose: 'See prescribing information',
      maxDose: 'See prescribing information',
      frequency: 'As directed',
      route: 'Oral',
    },
    icd10Suggestions: [],
    drugInteractions: [],
    contraindications: [],
    monitoringRequirements: [],
    patientEducation: ['Consult with your healthcare provider for specific guidance'],
    clinicalNotes: 'AI analysis could not be completed. Please refer to clinical references.',
    confidence: {
      overall: 0,
      breakdown: { dosing: 0, interactions: 0, contraindications: 0 },
    },
    disclaimer: 'This analysis is for clinical decision support only and does not constitute medical advice. All prescribing decisions must be made by a licensed healthcare provider.',
  };

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        dosageRecommendation: parsed.dosageRecommendation || defaultResult.dosageRecommendation,
        icd10Suggestions: parsed.icd10Suggestions || [],
        drugInteractions: parsed.drugInteractions || [],
        contraindications: parsed.contraindications || [],
        monitoringRequirements: parsed.monitoringRequirements || [],
        patientEducation: parsed.patientEducation || [],
        clinicalNotes: parsed.clinicalNotes || '',
        confidence: parsed.confidence || defaultResult.confidence,
        disclaimer: defaultResult.disclaimer,
      };
    }
  } catch {
    // Return default if parsing fails
  }

  return defaultResult;
}

/**
 * Parse treatment recommendations response
 */
export function parseTreatmentRecommendationsResponse(response: AIResponse): TreatmentRecommendationsResult {
  const defaultResult: TreatmentRecommendationsResult = {
    recommendations: [],
    clinicalContext: 'AI analysis could not be completed.',
    differentialConsiderations: [],
    nonPharmacologicOptions: [],
    followUpRecommendations: ['Follow up with healthcare provider'],
    disclaimer: 'These recommendations are for clinical decision support only. Final treatment decisions must be made by a licensed healthcare provider.',
  };

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendations: parsed.recommendations || [],
        clinicalContext: parsed.clinicalContext || '',
        differentialConsiderations: parsed.differentialConsiderations || [],
        nonPharmacologicOptions: parsed.nonPharmacologicOptions || [],
        followUpRecommendations: parsed.followUpRecommendations || [],
        disclaimer: defaultResult.disclaimer,
      };
    }
  } catch {
    // Return default if parsing fails
  }

  return defaultResult;
}

/**
 * Validate medication analysis input
 */
export function validateMedicationAnalysisInput(input: unknown): MedicationAnalysisInput {
  return MedicationAnalysisInputSchema.parse(input);
}
