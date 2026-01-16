/**
 * Prescription Filling Module
 *
 * Handles prescription fill operations, pharmacist verification,
 * and dispensing records.
 */

import { z } from 'zod';
import type { DEASchedule } from './types';

// ============================================
// FILL TYPES
// ============================================

export interface Fill {
  id: string;
  prescriptionId: string;
  rxNumber: string;
  fillNumber: number;
  fillDate: Date;
  patientId: string;
  patientName: string;
  drugName: string;
  dispensedNdc: string;
  prescribedNdc?: string;
  strength: string;
  dosageForm: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  daysSupply: number;
  directions: string;
  dawCode: number;
  isPartialFill: boolean;
  partialFillReason?: PartialFillReason;
  remainingQuantity?: number;
  deaSchedule?: DEASchedule;
  lotNumber?: string;
  expirationDate?: Date;
  manufacturerName?: string;

  // Personnel
  enteredBy: string;
  filledBy: string;
  verifiedBy?: string;
  counseledBy?: string;

  // Timestamps
  enteredAt: Date;
  filledAt?: Date;
  verifiedAt?: Date;
  counseledAt?: Date;
  soldAt?: Date;
  deliveredAt?: Date;

  // Status
  status: FillStatus;
  verificationStatus: VerificationStatus;

  // Packaging
  packagingType: PackagingType;
  labelCount: number;
  auxiliaryLabels: string[];

  // Pricing
  acquisitionCost: number;
  dispensingFee: number;
  grossPrice: number;
  insurancePaid?: number;
  patientPaid?: number;

  // Claims
  claimId?: string;
  priorAuthNumber?: string;

  // Location
  binLocation?: string;
  deliveryMethod: DeliveryMethod;
  deliveryStatus?: DeliveryStatus;
  trackingNumber?: string;

  // Notes
  pharmacistNotes?: string;
  patientInstructions?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type FillStatus =
  | 'pending' // Awaiting fill
  | 'in_progress' // Being filled
  | 'filled' // Filled, awaiting verification
  | 'verified' // Pharmacist verified
  | 'ready' // Ready for pickup/delivery
  | 'sold' // Picked up
  | 'delivered' // Delivered
  | 'returned' // Returned to stock
  | 'cancelled'; // Cancelled

export type VerificationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'requires_changes';

export type PackagingType =
  | 'vial'
  | 'bottle'
  | 'blister_pack'
  | 'unit_dose'
  | 'oral_syringe'
  | 'tube'
  | 'box'
  | 'inhaler'
  | 'patch'
  | 'injection'
  | 'other';

export type DeliveryMethod = 'pickup' | 'local_delivery' | 'mail' | 'courier' | 'facility_delivery';

export type DeliveryStatus = 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'returned';

export type PartialFillReason =
  | 'insufficient_stock'
  | 'schedule_2_ltc' // Schedule II in LTC
  | 'patient_request'
  | 'emergency_partial'
  | 'insurance_quantity_limit';

// ============================================
// VERIFICATION TYPES
// ============================================

export interface VerificationChecklist {
  patientCorrect: boolean;
  drugCorrect: boolean;
  strengthCorrect: boolean;
  quantityCorrect: boolean;
  directionsCorrect: boolean;
  refillsCorrect: boolean;
  expirationValid: boolean;
  durReviewed: boolean;
  interactionsCleared: boolean;
  allergiesCleared: boolean;
  labelCorrect: boolean;
  auxiliaryLabelsCorrect: boolean;
  packagingAppropriate: boolean;
  appearanceCorrect: boolean;
}

export interface VerificationResult {
  approved: boolean;
  checklist: VerificationChecklist;
  pharmacistId: string;
  pharmacistName: string;
  verifiedAt: Date;
  notes?: string;
  rejectionReason?: string;
  requiredChanges?: string[];
}

// ============================================
// COUNSELING TYPES
// ============================================

export interface CounselingRecord {
  id: string;
  fillId: string;
  patientId: string;
  pharmacistId: string;
  pharmacistName: string;
  counselingDate: Date;
  counselingType: CounselingType;
  topicsCovered: CounselingTopic[];
  duration: number; // minutes
  language: string;
  interpreterUsed: boolean;
  patientUnderstood: boolean;
  patientRefused: boolean;
  refusalReason?: string;
  followUpNeeded: boolean;
  followUpNotes?: string;
  notes?: string;
}

export type CounselingType = 'new_rx' | 'new_therapy' | 'refill' | 'change' | 'requested' | 'high_risk';

export type CounselingTopic =
  | 'indication'
  | 'dosage'
  | 'administration'
  | 'storage'
  | 'side_effects'
  | 'drug_interactions'
  | 'food_interactions'
  | 'precautions'
  | 'monitoring'
  | 'refill_info'
  | 'disposal';

// ============================================
// AUXILIARY LABELS
// ============================================

export const AUXILIARY_LABELS: Record<string, AuxiliaryLabel> = {
  TAKE_WITH_FOOD: {
    code: 'AWF',
    text: 'Take with food',
    color: 'green',
  },
  TAKE_ON_EMPTY_STOMACH: {
    code: 'AES',
    text: 'Take on empty stomach',
    color: 'yellow',
  },
  MAY_CAUSE_DROWSINESS: {
    code: 'MCD',
    text: 'May cause drowsiness. Use caution when driving.',
    color: 'orange',
  },
  AVOID_ALCOHOL: {
    code: 'AAL',
    text: 'Avoid alcoholic beverages',
    color: 'red',
  },
  AVOID_SUNLIGHT: {
    code: 'ASL',
    text: 'Avoid prolonged sun exposure',
    color: 'yellow',
  },
  REFRIGERATE: {
    code: 'REF',
    text: 'Keep refrigerated',
    color: 'blue',
  },
  DO_NOT_REFRIGERATE: {
    code: 'DNR',
    text: 'Do not refrigerate',
    color: 'blue',
  },
  SHAKE_WELL: {
    code: 'SHK',
    text: 'Shake well before using',
    color: 'green',
  },
  FOR_EXTERNAL_USE_ONLY: {
    code: 'EXT',
    text: 'For external use only',
    color: 'red',
  },
  COMPLETE_ENTIRE_COURSE: {
    code: 'CEC',
    text: 'Finish all medication unless directed otherwise',
    color: 'green',
  },
  TAKE_WITH_PLENTY_OF_WATER: {
    code: 'TWW',
    text: 'Take with plenty of water',
    color: 'blue',
  },
  DO_NOT_CRUSH: {
    code: 'DNC',
    text: 'Do not crush or chew',
    color: 'red',
  },
  MAY_DISCOLOR_URINE: {
    code: 'MDU',
    text: 'May discolor urine',
    color: 'yellow',
  },
  CONTROLLED_SUBSTANCE: {
    code: 'CTL',
    text: 'CONTROLLED SUBSTANCE - Dangerous unless used as directed',
    color: 'red',
  },
  HIGH_ALERT_MEDICATION: {
    code: 'HAM',
    text: 'HIGH ALERT MEDICATION',
    color: 'red',
  },
};

export interface AuxiliaryLabel {
  code: string;
  text: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
}

// ============================================
// FILL FUNCTIONS
// ============================================

/**
 * Create a new fill record
 */
export function createFill(
  prescription: {
    id: string;
    rxNumber: string;
    patientId: string;
    patientName: string;
    drugName: string;
    ndc: string;
    strength: string;
    dosageForm: string;
    quantity: number;
    daysSupply: number;
    directions: string;
    deaSchedule?: DEASchedule;
    refillsRemaining: number;
  },
  fillNumber: number,
  userId: string
): Partial<Fill> {
  return {
    id: `FILL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    prescriptionId: prescription.id,
    rxNumber: prescription.rxNumber,
    fillNumber,
    fillDate: new Date(),
    patientId: prescription.patientId,
    patientName: prescription.patientName,
    drugName: prescription.drugName,
    dispensedNdc: prescription.ndc,
    prescribedNdc: prescription.ndc,
    strength: prescription.strength,
    dosageForm: prescription.dosageForm,
    quantityPrescribed: prescription.quantity,
    quantityDispensed: prescription.quantity,
    daysSupply: prescription.daysSupply,
    directions: prescription.directions,
    dawCode: 0, // Default: no product selection indicated
    isPartialFill: false,
    deaSchedule: prescription.deaSchedule,
    enteredBy: userId,
    filledBy: userId,
    enteredAt: new Date(),
    status: 'pending',
    verificationStatus: 'pending',
    packagingType: 'vial',
    labelCount: 1,
    auxiliaryLabels: [],
    acquisitionCost: 0,
    dispensingFee: 0,
    grossPrice: 0,
    deliveryMethod: 'pickup',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Calculate refill eligibility
 */
export function canRefill(
  prescription: {
    deaSchedule?: DEASchedule;
    refillsRemaining: number;
    writtenDate: Date;
    expirationDate: Date;
    lastFillDate?: Date;
    daysSupply: number;
  }
): RefillEligibility {
  const today = new Date();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if prescription is expired
  if (prescription.expirationDate < today) {
    errors.push('Prescription has expired');
  }

  // Check refills remaining
  if (prescription.refillsRemaining <= 0) {
    errors.push('No refills remaining');
  }

  // Check refill too soon (80% rule)
  if (prescription.lastFillDate) {
    const daysSinceLastFill = Math.floor(
      (today.getTime() - prescription.lastFillDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const earliestRefillDay = Math.floor(prescription.daysSupply * 0.8);

    if (daysSinceLastFill < earliestRefillDay) {
      const daysUntilRefill = earliestRefillDay - daysSinceLastFill;
      warnings.push(`Refill too soon. Eligible in ${daysUntilRefill} days.`);
    }
  }

  // Schedule II specific check
  if (prescription.deaSchedule === 'II') {
    // Schedule II cannot be refilled
    if (prescription.refillsRemaining > 0) {
      // This shouldn't happen, but check anyway
      errors.push('Schedule II prescriptions cannot be refilled');
    }

    // Check 90-day validity for Schedule II
    const daysSinceWritten = Math.floor(
      (today.getTime() - prescription.writtenDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceWritten > 90) {
      errors.push('Schedule II prescription expired (>90 days from written date)');
    }
  }

  // Check C-III through C-V 6-month limit
  if (['III', 'IV', 'V'].includes(prescription.deaSchedule || '')) {
    const daysSinceWritten = Math.floor(
      (today.getTime() - prescription.writtenDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceWritten > 180) {
      errors.push('Controlled substance prescription expired (>6 months from written date)');
    }
  }

  // Extract days until eligible from first warning if present
  const firstWarning = warnings[0];
  const daysMatch = firstWarning?.match(/\d+/);
  const daysUntilEligible = daysMatch?.[0] ? parseInt(daysMatch[0]) : 0;

  return {
    canRefill: errors.length === 0,
    errors,
    warnings,
    refillsRemaining: prescription.refillsRemaining,
    daysUntilEligible,
  };
}

export interface RefillEligibility {
  canRefill: boolean;
  errors: string[];
  warnings: string[];
  refillsRemaining: number;
  daysUntilEligible: number;
}

/**
 * Validate fill before verification
 */
export function validateFillForVerification(fill: Fill): FillValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!fill.dispensedNdc) errors.push('Dispensed NDC is required');
  if (!fill.lotNumber) warnings.push('Lot number should be recorded');
  if (!fill.expirationDate) warnings.push('Expiration date should be recorded');
  if (fill.quantityDispensed <= 0) errors.push('Quantity must be greater than 0');
  if (fill.quantityDispensed > fill.quantityPrescribed && !fill.isPartialFill) {
    errors.push('Dispensed quantity exceeds prescribed quantity');
  }

  // Check expiration
  if (fill.expirationDate && fill.expirationDate < new Date()) {
    errors.push('Cannot dispense expired medication');
  }

  // Check if expiring within days supply
  if (fill.expirationDate) {
    const daysSupplyEnd = new Date();
    daysSupplyEnd.setDate(daysSupplyEnd.getDate() + fill.daysSupply);
    if (fill.expirationDate < daysSupplyEnd) {
      warnings.push('Medication expires before end of days supply');
    }
  }

  // DAW code validation
  if (fill.dawCode < 0 || fill.dawCode > 9) {
    errors.push('Invalid DAW code');
  }

  // Controlled substance checks
  if (fill.deaSchedule && ['II', 'III', 'IV', 'V'].includes(fill.deaSchedule)) {
    if (!fill.lotNumber) errors.push('Lot number required for controlled substances');
    // Controlled substance auxiliary label
    if (!fill.auxiliaryLabels.includes('CONTROLLED_SUBSTANCE')) {
      warnings.push('Controlled substance label recommended');
    }
  }

  // Partial fill validation
  if (fill.isPartialFill) {
    if (!fill.partialFillReason) errors.push('Partial fill reason required');
    if (fill.remainingQuantity === undefined) errors.push('Remaining quantity must be specified');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiresPharmacistOverride: errors.length > 0,
  };
}

export interface FillValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiresPharmacistOverride: boolean;
}

/**
 * Get recommended auxiliary labels based on drug
 */
export function getRecommendedAuxiliaryLabels(
  drugName: string,
  drugClass?: string,
  isControlled: boolean = false
): string[] {
  const labels: string[] = [];
  const drugNameLower = drugName.toLowerCase();
  const drugClassLower = (drugClass || '').toLowerCase();

  // Add controlled substance label
  if (isControlled) {
    labels.push('CONTROLLED_SUBSTANCE');
  }

  // Antibiotics
  if (drugClassLower.includes('antibiotic') || drugNameLower.includes('cillin') ||
      drugNameLower.includes('mycin') || drugNameLower.includes('floxacin')) {
    labels.push('COMPLETE_ENTIRE_COURSE');
  }

  // Fluoroquinolones
  if (drugNameLower.includes('floxacin')) {
    labels.push('AVOID_SUNLIGHT');
    labels.push('TAKE_WITH_PLENTY_OF_WATER');
  }

  // Tetracyclines
  if (drugNameLower.includes('cycline')) {
    labels.push('AVOID_SUNLIGHT');
    labels.push('TAKE_ON_EMPTY_STOMACH');
  }

  // NSAIDs
  if (drugClassLower.includes('nsaid') || drugNameLower.includes('ibuprofen') ||
      drugNameLower.includes('naproxen')) {
    labels.push('TAKE_WITH_FOOD');
  }

  // Sedatives/hypnotics
  if (drugClassLower.includes('sedative') || drugClassLower.includes('hypnotic') ||
      drugClassLower.includes('benzodiazepine') || drugClassLower.includes('opioid')) {
    labels.push('MAY_CAUSE_DROWSINESS');
    labels.push('AVOID_ALCOHOL');
  }

  // Metronidazole
  if (drugNameLower.includes('metronidazole')) {
    labels.push('AVOID_ALCOHOL');
    labels.push('COMPLETE_ENTIRE_COURSE');
  }

  // Insulin
  if (drugNameLower.includes('insulin')) {
    labels.push('REFRIGERATE');
    labels.push('HIGH_ALERT_MEDICATION');
  }

  // Warfarin
  if (drugNameLower.includes('warfarin')) {
    labels.push('HIGH_ALERT_MEDICATION');
    labels.push('AVOID_ALCOHOL');
  }

  // Suspensions
  if (drugNameLower.includes('suspension') || drugNameLower.includes('liquid')) {
    labels.push('SHAKE_WELL');
  }

  // Topicals
  if (drugClassLower.includes('topical') || drugNameLower.includes('cream') ||
      drugNameLower.includes('ointment')) {
    labels.push('FOR_EXTERNAL_USE_ONLY');
  }

  // Extended release
  if (drugNameLower.includes(' er') || drugNameLower.includes(' xr') ||
      drugNameLower.includes(' xl') || drugNameLower.includes('extended')) {
    labels.push('DO_NOT_CRUSH');
  }

  return [...new Set(labels)]; // Remove duplicates
}

/**
 * Calculate days until next refill is due
 */
export function calculateDaysUntilRefillDue(
  lastFillDate: Date,
  daysSupply: number,
  bufferDays: number = 7
): RefillDueInfo {
  const today = new Date();
  const dueDate = new Date(lastFillDate);
  dueDate.setDate(dueDate.getDate() + daysSupply - bufferDays);

  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    dueDate,
    daysUntilDue,
    isDue: daysUntilDue <= 0,
    isDueSoon: daysUntilDue > 0 && daysUntilDue <= bufferDays,
    estimatedRunOutDate: new Date(lastFillDate.getTime() + daysSupply * 24 * 60 * 60 * 1000),
  };
}

export interface RefillDueInfo {
  dueDate: Date;
  daysUntilDue: number;
  isDue: boolean;
  isDueSoon: boolean;
  estimatedRunOutDate: Date;
}

/**
 * Generate fill label data
 */
export function generateLabelData(fill: Fill, pharmacy: PharmacyInfo): LabelData {
  return {
    // Pharmacy info
    pharmacyName: pharmacy.name,
    pharmacyAddress: pharmacy.address,
    pharmacyPhone: pharmacy.phone,

    // Patient info
    patientName: fill.patientName,

    // Prescription info
    rxNumber: fill.rxNumber,
    fillDate: fill.fillDate,
    drugName: fill.drugName,
    strength: fill.strength,
    dosageForm: fill.dosageForm,
    manufacturerName: fill.manufacturerName || '',
    ndc: fill.dispensedNdc,
    quantity: fill.quantityDispensed,
    daysSupply: fill.daysSupply,
    directions: fill.directions,
    refillsRemaining: 0, // Would come from prescription
    discard: calculateDiscardDate(fill.fillDate, fill.daysSupply, fill.expirationDate),

    // Control info
    isControlled: !!fill.deaSchedule,
    deaSchedule: fill.deaSchedule,

    // Auxiliary labels
    auxiliaryLabels: fill.auxiliaryLabels.map(code => AUXILIARY_LABELS[code]?.text || code),

    // Pharmacist
    pharmacistInitials: '', // Would be populated from verified by

    // Warnings
    warnings: generateLabelWarnings(fill),
  };
}

export interface LabelData {
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  patientName: string;
  rxNumber: string;
  fillDate: Date;
  drugName: string;
  strength: string;
  dosageForm: string;
  manufacturerName: string;
  ndc: string;
  quantity: number;
  daysSupply: number;
  directions: string;
  refillsRemaining: number;
  discard: Date;
  isControlled: boolean;
  deaSchedule?: DEASchedule;
  auxiliaryLabels: string[];
  pharmacistInitials: string;
  warnings: string[];
}

interface PharmacyInfo {
  name: string;
  address: string;
  phone: string;
}

function calculateDiscardDate(fillDate: Date, daysSupply: number, expirationDate?: Date): Date {
  const discardBySupply = new Date(fillDate);
  discardBySupply.setDate(discardBySupply.getDate() + daysSupply + 14); // 2 weeks buffer

  if (expirationDate && expirationDate < discardBySupply) {
    return expirationDate;
  }

  return discardBySupply;
}

function generateLabelWarnings(fill: Fill): string[] {
  const warnings: string[] = [];

  if (fill.deaSchedule) {
    warnings.push('Federal law prohibits transfer of this drug to any person other than the patient for whom it was prescribed.');
  }

  return warnings;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const FillSchema = z.object({
  prescriptionId: z.string().uuid(),
  fillNumber: z.number().min(0),
  patientId: z.string().uuid(),
  dispensedNdc: z.string(),
  quantityDispensed: z.number().positive(),
  daysSupply: z.number().positive(),
  directions: z.string(),
  dawCode: z.number().min(0).max(9),
  isPartialFill: z.boolean(),
  partialFillReason: z.enum([
    'insufficient_stock',
    'schedule_2_ltc',
    'patient_request',
    'emergency_partial',
    'insurance_quantity_limit',
  ]).optional(),
  lotNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  packagingType: z.enum([
    'vial', 'bottle', 'blister_pack', 'unit_dose', 'oral_syringe',
    'tube', 'box', 'inhaler', 'patch', 'injection', 'other',
  ]),
  deliveryMethod: z.enum(['pickup', 'local_delivery', 'mail', 'courier', 'facility_delivery']),
});

export const VerificationChecklistSchema = z.object({
  patientCorrect: z.boolean(),
  drugCorrect: z.boolean(),
  strengthCorrect: z.boolean(),
  quantityCorrect: z.boolean(),
  directionsCorrect: z.boolean(),
  refillsCorrect: z.boolean(),
  expirationValid: z.boolean(),
  durReviewed: z.boolean(),
  interactionsCleared: z.boolean(),
  allergiesCleared: z.boolean(),
  labelCorrect: z.boolean(),
  auxiliaryLabelsCorrect: z.boolean(),
  packagingAppropriate: z.boolean(),
  appearanceCorrect: z.boolean(),
});

export const CounselingRecordSchema = z.object({
  fillId: z.string().uuid(),
  patientId: z.string().uuid(),
  pharmacistId: z.string().uuid(),
  counselingType: z.enum(['new_rx', 'new_therapy', 'refill', 'change', 'requested', 'high_risk']),
  topicsCovered: z.array(z.enum([
    'indication', 'dosage', 'administration', 'storage', 'side_effects',
    'drug_interactions', 'food_interactions', 'precautions', 'monitoring',
    'refill_info', 'disposal',
  ])),
  duration: z.number().positive(),
  language: z.string(),
  patientUnderstood: z.boolean(),
  patientRefused: z.boolean(),
});
