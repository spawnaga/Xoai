/**
 * MedsCab Type Definitions
 *
 * Comprehensive types for medication management, drug interactions,
 * and clinical decision support.
 */

import { z } from 'zod';

// ============================================
// DRUG & MEDICATION TYPES
// ============================================

export interface Drug {
  id: string;
  ndc: string; // National Drug Code
  genericName: string;
  brandName: string;
  strength: string;
  dosageForm: string;
  route: string;
  unit: string;
  manufacturer: string;
  activeIngredients: string[];
  deaSchedule?: DEASchedule;
  drugClass?: string;
  rxcui?: string; // RxNorm Concept Unique Identifier
  createdAt: Date;
  updatedAt: Date;
}

export type DEASchedule = 'I' | 'II' | 'III' | 'IV' | 'V' | 'LEGEND' | 'OTC';

export const DEAScheduleInfo: Record<DEASchedule, { description: string; refillsAllowed: number; maxQuantity?: number }> = {
  'I': { description: 'Schedule I - No accepted medical use', refillsAllowed: 0 },
  'II': { description: 'Schedule II - High potential for abuse', refillsAllowed: 0, maxQuantity: 90 },
  'III': { description: 'Schedule III - Moderate potential for abuse', refillsAllowed: 5, maxQuantity: 180 },
  'IV': { description: 'Schedule IV - Low potential for abuse', refillsAllowed: 5, maxQuantity: 180 },
  'V': { description: 'Schedule V - Limited potential for abuse', refillsAllowed: 5 },
  'LEGEND': { description: 'Prescription required', refillsAllowed: 11 },
  'OTC': { description: 'Over-the-counter', refillsAllowed: 99 },
};

// ============================================
// DRUG SEARCH TYPES
// ============================================

export interface DrugSearchParams {
  query: string;
  limit?: number;
  includeInactive?: boolean;
  dosageForm?: string;
  route?: string;
}

export interface DrugSearchResult {
  drugs: Drug[];
  totalCount: number;
  source: 'database' | 'rxnorm' | 'fallback';
}

// ============================================
// DRUG INTERACTION TYPES
// ============================================

export type InteractionSeverity = 'high' | 'moderate' | 'low';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: InteractionSeverity;
  description: string;
  clinicalEffect: string;
  recommendation: string;
  mechanism?: string;
  references?: string[];
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  highSeverityCount: number;
  moderateSeverityCount: number;
  lowSeverityCount: number;
  summary: string;
}

// ============================================
// CONTRAINDICATION TYPES
// ============================================

export interface Contraindication {
  drugName: string;
  condition: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
  alternativeDrugs?: string[];
}

export interface ContraindicationCheckResult {
  hasContraindications: boolean;
  contraindications: Contraindication[];
  patientConditions: string[];
}

// ============================================
// ALLERGY TYPES
// ============================================

export interface AllergyAlert {
  allergen: string;
  drugName: string;
  type: 'direct_match' | 'cross_reactivity' | 'class_allergy';
  severity: InteractionSeverity;
  reaction?: string;
  recommendation: string;
}

export interface AllergyCheckResult {
  hasAllergies: boolean;
  alerts: AllergyAlert[];
  crossReactivityWarnings: string[];
}

// Known allergy cross-reactivity classes
export const ALLERGY_CROSS_REACTIVITY: Record<string, string[]> = {
  'penicillin': ['amoxicillin', 'ampicillin', 'piperacillin', 'cephalosporins'],
  'sulfa': ['sulfamethoxazole', 'sulfasalazine', 'sulfadiazine', 'thiazides', 'furosemide'],
  'aspirin': ['ibuprofen', 'naproxen', 'ketorolac', 'indomethacin', 'nsaids'],
  'codeine': ['morphine', 'hydrocodone', 'oxycodone', 'tramadol', 'fentanyl'],
  'cephalosporins': ['cefazolin', 'ceftriaxone', 'cephalexin', 'cefuroxime'],
  'nsaids': ['ibuprofen', 'naproxen', 'meloxicam', 'celecoxib', 'diclofenac'],
  'ace_inhibitors': ['lisinopril', 'enalapril', 'ramipril', 'benazepril', 'captopril'],
  'statins': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
  'shellfish': ['iodine_contrast'], // Cross-reactivity consideration
};

// ============================================
// DUR (DRUG UTILIZATION REVIEW) TYPES
// ============================================

export type DURAlertType =
  | 'drug_interaction'
  | 'allergy'
  | 'contraindication'
  | 'duplicate_therapy'
  | 'dosing_alert'
  | 'age_alert'
  | 'pregnancy_alert'
  | 'renal_alert'
  | 'hepatic_alert'
  | 'monitoring_required';

export interface DURAlert {
  type: DURAlertType;
  severity: InteractionSeverity;
  code: string;
  message: string;
  recommendation: string;
  category: string;
  overridable: boolean;
  requiresDocumentation: boolean;
}

export interface DURCheckInput {
  patientId: string;
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  indication?: string;
  currentMedications?: string[];
  patientAllergies?: string[];
  patientConditions?: string[];
  patientAge?: number;
  creatinineClearance?: number;
  hepaticFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
  isPregnant?: boolean;
  isNursing?: boolean;
}

export interface DURCheckResult {
  passed: boolean;
  alerts: DURAlert[];
  alertCount: number;
  hasHighSeverityAlerts: boolean;
  summary: string;
  consultationNotes?: string;
  aiGeneratedNotes?: boolean;
  timestamp: Date;
}

// ============================================
// DOSING GUIDELINES TYPES
// ============================================

export interface DosingGuidelinesInput {
  drugName: string;
  patientAge: number;
  patientWeight?: number; // kg
  creatinineClearance?: number; // mL/min
  hepaticFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
  indication?: string;
}

export interface DosingGuideline {
  drugName: string;
  indication: string;
  standardDose: string;
  adjustedDose?: string;
  frequency: string;
  route: string;
  maxDailyDose: string;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  pediatricDose?: string;
  geriatricConsiderations?: string;
  monitoringParameters: string[];
  notes: string[];
}

export interface DosingGuidelinesResult {
  guidelines: DosingGuideline[];
  patientSpecific: {
    ageGroup: 'pediatric' | 'adult' | 'geriatric';
    renalStatus: string;
    hepaticStatus: string;
    requiresAdjustment: boolean;
  };
}

// ============================================
// PRESCRIPTION TYPES
// ============================================

export interface Prescription {
  id: string;
  rxNumber: string;
  patientId: string;
  prescriberId: string;
  drugId: string;
  drugName: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  quantityUnit: string;
  daysSupply: number;
  sig: string; // Signa - directions
  refillsAuthorized: number;
  refillsRemaining: number;
  deaSchedule?: DEASchedule;
  indication?: string;
  icd10Codes?: string[];
  status: PrescriptionStatus;
  writtenDate: Date;
  expirationDate: Date;
  filledDate?: Date;
  pharmacyId?: string;
  notes?: string;
  durAlerts?: DURAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export type PrescriptionStatus =
  | 'pending'
  | 'active'
  | 'filled'
  | 'partial_fill'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'transferred';

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const DrugSearchParamsSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(100).optional().default(25),
  includeInactive: z.boolean().optional().default(false),
  dosageForm: z.string().optional(),
  route: z.string().optional(),
});

export const DURCheckInputSchema = z.object({
  patientId: z.string().uuid(),
  drugId: z.string(),
  drugName: z.string().min(1),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string(),
  indication: z.string().optional(),
  currentMedications: z.array(z.string()).optional(),
  patientAllergies: z.array(z.string()).optional(),
  patientConditions: z.array(z.string()).optional(),
  patientAge: z.number().min(0).max(150).optional(),
  creatinineClearance: z.number().min(0).max(200).optional(),
  hepaticFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  isPregnant: z.boolean().optional(),
  isNursing: z.boolean().optional(),
});

export const PrescriptionCreateSchema = z.object({
  patientId: z.string().uuid(),
  drugId: z.string(),
  drugName: z.string().min(1),
  strength: z.string(),
  dosageForm: z.string(),
  quantity: z.number().min(1).max(1000),
  quantityUnit: z.string(),
  daysSupply: z.number().min(1).max(365),
  sig: z.string().min(1).max(500),
  refillsAuthorized: z.number().min(0).max(11),
  deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V', 'LEGEND', 'OTC']).optional(),
  indication: z.string().optional(),
  icd10Codes: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const DosingGuidelinesInputSchema = z.object({
  drugName: z.string().min(1),
  patientAge: z.number().min(0).max(150),
  patientWeight: z.number().min(0).max(500).optional(),
  creatinineClearance: z.number().min(0).max(200).optional(),
  hepaticFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  indication: z.string().optional(),
});
