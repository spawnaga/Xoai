/**
 * Verification Workflow Module
 *
 * Handles pharmacist verification, DUR review,
 * barcode scanning, and final approval for retail pharmacy.
 */

import { z } from 'zod';
import type { DURAlertType } from './types';

// ============================================
// VERIFICATION TYPES
// ============================================

export interface VerificationSession {
  id: string;
  prescriptionId: string;
  fillId: string;
  pharmacistId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: VerificationSessionStatus;

  // Checklist
  checklist: VerificationChecklist;
  checklistCompleted: boolean;

  // Barcode Scanning
  ndcScanned: string | null;
  ndcVerified: boolean;
  scanTimestamp: Date | null;

  // DUR Review
  durAlertsReviewed: boolean;
  durOverrides: DUROverrideRecord[];

  // Final Decision
  decision: VerificationDecision | null;
  rejectionReason: string | null;
  notes: string | null;
}

export type VerificationSessionStatus =
  | 'in_progress'
  | 'pending_dur'
  | 'pending_scan'
  | 'approved'
  | 'rejected'
  | 'returned';

export type VerificationDecision = 'approved' | 'rejected' | 'returned_for_rework';

export interface VerificationChecklist {
  // Patient Verification
  patientNameCorrect: boolean;
  patientDobCorrect: boolean;
  patientAddressCorrect: boolean;
  patientAllergiesReviewed: boolean;

  // Prescription Verification
  prescriberCorrect: boolean;
  drugCorrect: boolean;
  strengthCorrect: boolean;
  dosageFormCorrect: boolean;
  quantityCorrect: boolean;
  daysSupplyCorrect: boolean;
  directionsCorrect: boolean;
  refillsCorrect: boolean;
  dawCodeCorrect: boolean;

  // Clinical Verification
  durAlertsReviewed: boolean;
  interactionsCleared: boolean;
  allergiesCleared: boolean;
  dosageAppropriate: boolean;
  duplicateTherapyCleared: boolean;

  // Dispensing Verification
  ndcVerified: boolean;
  lotNumberRecorded: boolean;
  expirationValid: boolean;
  quantityInVialCorrect: boolean;
  labelCorrect: boolean;
  auxiliaryLabelsCorrect: boolean;
  packagingAppropriate: boolean;
  appearanceCorrect: boolean;

  // Controlled Substance (if applicable)
  deaScheduleVerified: boolean | null;
  pdmpReviewed: boolean | null;
  idRequirementNoted: boolean | null;
}

export interface DUROverrideRecord {
  durAlertId: string;
  alertType: DURAlertType;
  severity: 'high' | 'moderate' | 'low';
  alertMessage: string;
  overrideCode: string;
  overrideReason: string;
  overriddenAt: Date;
  pharmacistId: string;
  pharmacistName: string;
}

// ============================================
// VERIFICATION CHECKLIST FUNCTIONS
// ============================================

/**
 * Create a new verification checklist with defaults
 */
export function createVerificationChecklist(
  isControlledSubstance: boolean = false
): VerificationChecklist {
  return {
    // Patient
    patientNameCorrect: false,
    patientDobCorrect: false,
    patientAddressCorrect: false,
    patientAllergiesReviewed: false,

    // Prescription
    prescriberCorrect: false,
    drugCorrect: false,
    strengthCorrect: false,
    dosageFormCorrect: false,
    quantityCorrect: false,
    daysSupplyCorrect: false,
    directionsCorrect: false,
    refillsCorrect: false,
    dawCodeCorrect: false,

    // Clinical
    durAlertsReviewed: false,
    interactionsCleared: false,
    allergiesCleared: false,
    dosageAppropriate: false,
    duplicateTherapyCleared: false,

    // Dispensing
    ndcVerified: false,
    lotNumberRecorded: false,
    expirationValid: false,
    quantityInVialCorrect: false,
    labelCorrect: false,
    auxiliaryLabelsCorrect: false,
    packagingAppropriate: false,
    appearanceCorrect: false,

    // Controlled substance fields - null if not applicable
    deaScheduleVerified: isControlledSubstance ? false : null,
    pdmpReviewed: isControlledSubstance ? false : null,
    idRequirementNoted: isControlledSubstance ? false : null,
  };
}

/**
 * Check if all required checklist items are complete
 */
export function isChecklistComplete(
  checklist: VerificationChecklist,
  options?: { skipPdmp?: boolean }
): ChecklistValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for all prescriptions
  const requiredFields: (keyof VerificationChecklist)[] = [
    'patientNameCorrect',
    'patientDobCorrect',
    'patientAllergiesReviewed',
    'prescriberCorrect',
    'drugCorrect',
    'strengthCorrect',
    'quantityCorrect',
    'daysSupplyCorrect',
    'directionsCorrect',
    'durAlertsReviewed',
    'interactionsCleared',
    'allergiesCleared',
    'ndcVerified',
    'expirationValid',
    'labelCorrect',
    'packagingAppropriate',
    'appearanceCorrect',
  ];

  for (const field of requiredFields) {
    if (checklist[field] !== true) {
      errors.push(`${formatFieldName(field)} must be verified`);
    }
  }

  // Warning fields (should be checked but not blocking)
  const warningFields: (keyof VerificationChecklist)[] = [
    'patientAddressCorrect',
    'dosageFormCorrect',
    'refillsCorrect',
    'dawCodeCorrect',
    'lotNumberRecorded',
    'quantityInVialCorrect',
    'auxiliaryLabelsCorrect',
  ];

  for (const field of warningFields) {
    if (checklist[field] !== true) {
      warnings.push(`${formatFieldName(field)} should be verified`);
    }
  }

  // Controlled substance specific checks
  if (checklist.deaScheduleVerified !== null) {
    if (!checklist.deaScheduleVerified) {
      errors.push('DEA schedule must be verified for controlled substances');
    }
    if (checklist.pdmpReviewed !== true && !options?.skipPdmp) {
      errors.push('PDMP must be reviewed for controlled substances');
    }
    if (checklist.idRequirementNoted !== true) {
      warnings.push('ID requirement should be noted for controlled substances');
    }
  }

  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
    completedCount: countCompletedItems(checklist),
    totalCount: countTotalItems(checklist),
  };
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace('Correct', '')
    .replace('Reviewed', '')
    .replace('Verified', '')
    .replace('Cleared', '')
    .trim();
}

function countCompletedItems(checklist: VerificationChecklist): number {
  let count = 0;
  for (const value of Object.values(checklist)) {
    if (value === true) count++;
  }
  return count;
}

function countTotalItems(checklist: VerificationChecklist): number {
  let count = 0;
  for (const value of Object.values(checklist)) {
    if (value !== null) count++;
  }
  return count;
}

export interface ChecklistValidation {
  isComplete: boolean;
  errors: string[];
  warnings: string[];
  completedCount: number;
  totalCount: number;
}

// ============================================
// NDC BARCODE SCANNING
// ============================================

/**
 * Parse barcode data to extract NDC
 */
export function parseNdcFromBarcode(barcodeData: string): BarcodeParseResult {
  // Remove any whitespace
  const cleaned = barcodeData.trim();

  // Try different barcode formats

  // UPC-A (12 digits) - common on drug packages
  if (/^\d{12}$/.test(cleaned)) {
    // Convert UPC-A to NDC by removing leading 0 and check digit
    const ndc = cleaned.substring(1, 11);
    return {
      success: true,
      ndc: normalizeNdc(ndc),
      format: 'UPC-A',
      rawData: barcodeData,
    };
  }

  // NDC direct (10 or 11 digits)
  if (/^\d{10,11}$/.test(cleaned)) {
    return {
      success: true,
      ndc: normalizeNdc(cleaned),
      format: 'NDC',
      rawData: barcodeData,
    };
  }

  // NDC with dashes (various formats: 5-4-2, 5-3-2, 4-4-2, etc.)
  if (/^\d{4,5}-\d{3,4}-\d{1,2}$/.test(cleaned)) {
    const ndc = cleaned.replace(/-/g, '');
    return {
      success: true,
      ndc: normalizeNdc(ndc),
      format: 'NDC-formatted',
      rawData: barcodeData,
    };
  }

  // GS1 DataMatrix (starts with 01)
  if (cleaned.startsWith('01') && cleaned.length >= 16) {
    // Extract GTIN-14, then convert to NDC
    const gtin = cleaned.substring(2, 16);
    // Remove leading zeros and indicator digit
    const ndc = gtin.substring(3, 14);
    return {
      success: true,
      ndc: normalizeNdc(ndc),
      format: 'GS1-GTIN',
      rawData: barcodeData,
    };
  }

  return {
    success: false,
    ndc: null,
    format: null,
    rawData: barcodeData,
    error: 'Unable to parse barcode data',
  };
}

function normalizeNdc(ndc: string): string {
  // Remove non-digits and pad to 11 digits
  return ndc.replace(/\D/g, '').padStart(11, '0');
}

export interface BarcodeParseResult {
  success: boolean;
  ndc: string | null;
  format: string | null;
  rawData: string;
  error?: string;
}

/**
 * Verify scanned NDC matches expected NDC
 */
export function verifyNdcMatch(
  scannedNdc: string,
  expectedNdc: string,
  allowEquivalents: boolean = false
): NdcVerificationResult {
  const normalizedScanned = normalizeNdc(scannedNdc);
  const normalizedExpected = normalizeNdc(expectedNdc);

  if (normalizedScanned === normalizedExpected) {
    return {
      matches: true,
      scannedNdc: normalizedScanned,
      expectedNdc: normalizedExpected,
      matchType: 'exact',
    };
  }

  // Check for labeler (manufacturer) match (first 5 digits)
  const scannedLabeler = normalizedScanned.substring(0, 5);
  const expectedLabeler = normalizedExpected.substring(0, 5);

  if (scannedLabeler !== expectedLabeler) {
    return {
      matches: false,
      scannedNdc: normalizedScanned,
      expectedNdc: normalizedExpected,
      matchType: 'none',
      error: 'Different manufacturers',
    };
  }

  // Check for product match (next 4 digits)
  const scannedProduct = normalizedScanned.substring(5, 9);
  const expectedProduct = normalizedExpected.substring(5, 9);

  if (scannedProduct !== expectedProduct) {
    return {
      matches: false,
      scannedNdc: normalizedScanned,
      expectedNdc: normalizedExpected,
      matchType: 'labeler_only',
      error: 'Same manufacturer, different product',
    };
  }

  // Only package size differs
  if (allowEquivalents) {
    return {
      matches: true,
      scannedNdc: normalizedScanned,
      expectedNdc: normalizedExpected,
      matchType: 'package_variant',
      warning: 'Different package size - verify correct product',
    };
  }

  return {
    matches: false,
    scannedNdc: normalizedScanned,
    expectedNdc: normalizedExpected,
    matchType: 'package_variant',
    error: 'Package size mismatch',
  };
}

export interface NdcVerificationResult {
  matches: boolean;
  scannedNdc: string;
  expectedNdc: string;
  matchType: 'exact' | 'package_variant' | 'labeler_only' | 'none';
  error?: string;
  warning?: string;
}

// ============================================
// DUR REVIEW FUNCTIONS
// ============================================

/**
 * Professional service codes for DUR overrides
 */
export const DUR_OVERRIDE_CODES: Record<string, { code: string; description: string }> = {
  PRESCRIBER_CONSULTED: { code: 'M0', description: 'Prescriber was consulted' },
  PATIENT_CONSULTED: { code: 'P0', description: 'Patient was consulted' },
  PRESCRIBER_AUTHORIZED: { code: '1A', description: 'Filled as prescribed - prescriber aware of conflict' },
  PRESCRIBER_APPROVAL: { code: '2A', description: 'Prescriber authorization obtained' },
  THERAPY_UNCHANGED: { code: '3A', description: 'Drug therapy unchanged' },
  PATIENT_MONITORING: { code: '4A', description: 'Patient will be monitored' },
  CLINICAL_JUDGMENT: { code: '5A', description: 'Therapy is appropriate per clinical judgment' },
  LITERATURE_SUPPORT: { code: '6A', description: 'Therapy is appropriate per literature' },
  CONDITION_SPECIFIC: { code: '7A', description: 'Condition specific - therapy appropriate' },
  OTHER: { code: '99', description: 'Other - see notes' },
};

/**
 * Create DUR override record
 */
export function createDurOverride(
  alert: {
    id: string;
    type: DURAlertType;
    severity: 'high' | 'moderate' | 'low';
    message: string;
  },
  overrideCode: string,
  overrideReason: string,
  pharmacistId: string,
  pharmacistName: string
): DUROverrideRecord {
  return {
    durAlertId: alert.id,
    alertType: alert.type,
    severity: alert.severity,
    alertMessage: alert.message,
    overrideCode,
    overrideReason,
    overriddenAt: new Date(),
    pharmacistId,
    pharmacistName,
  };
}

/**
 * Check if all DUR alerts have been addressed
 */
export function checkDurAlertsResolved(
  alerts: Array<{ id: string; severity: 'high' | 'moderate' | 'low'; isOverridden: boolean }>,
  overrides: DUROverrideRecord[]
): DurReviewStatus {
  const overriddenIds = new Set(overrides.map(o => o.durAlertId));

  const unresolvedHigh: string[] = [];
  const unresolvedModerate: string[] = [];
  const unresolvedLow: string[] = [];

  for (const alert of alerts) {
    if (!alert.isOverridden && !overriddenIds.has(alert.id)) {
      switch (alert.severity) {
        case 'high':
          unresolvedHigh.push(alert.id);
          break;
        case 'moderate':
          unresolvedModerate.push(alert.id);
          break;
        case 'low':
          unresolvedLow.push(alert.id);
          break;
      }
    }
  }

  const hasUnresolvedHigh = unresolvedHigh.length > 0;
  const hasUnresolvedModerate = unresolvedModerate.length > 0;

  return {
    allResolved: !hasUnresolvedHigh && !hasUnresolvedModerate && unresolvedLow.length === 0,
    canProceed: !hasUnresolvedHigh, // Can proceed if no unresolved high severity
    unresolvedCount: {
      high: unresolvedHigh.length,
      moderate: unresolvedModerate.length,
      low: unresolvedLow.length,
    },
    message: hasUnresolvedHigh
      ? 'High severity DUR alerts must be resolved before proceeding'
      : hasUnresolvedModerate
        ? 'Moderate severity DUR alerts should be reviewed'
        : 'All DUR alerts resolved',
  };
}

export interface DurReviewStatus {
  allResolved: boolean;
  canProceed: boolean;
  unresolvedCount: {
    high: number;
    moderate: number;
    low: number;
  };
  message: string;
}

// ============================================
// VERIFICATION COMPLETION
// ============================================

/**
 * Validate that verification can be completed
 */
export function validateVerificationComplete(
  session: VerificationSession
): VerificationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check checklist
  const checklistResult = isChecklistComplete(session.checklist);
  if (!checklistResult.isComplete) {
    errors.push(...checklistResult.errors);
  }
  warnings.push(...checklistResult.warnings);

  // Check NDC verification
  if (!session.ndcVerified) {
    errors.push('NDC barcode must be scanned and verified');
  }

  // Check DUR review
  if (!session.durAlertsReviewed) {
    errors.push('DUR alerts must be reviewed');
  }

  return {
    canComplete: errors.length === 0,
    errors,
    warnings,
    checklistProgress: {
      completed: checklistResult.completedCount,
      total: checklistResult.totalCount,
      percentage: Math.round((checklistResult.completedCount / checklistResult.totalCount) * 100),
    },
  };
}

export interface VerificationValidation {
  canComplete: boolean;
  errors: string[];
  warnings: string[];
  checklistProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

/**
 * Complete verification session
 */
export function completeVerification(
  session: VerificationSession,
  decision: VerificationDecision,
  notes?: string,
  rejectionReason?: string
): VerificationSession {
  if (decision === 'rejected' && !rejectionReason) {
    throw new Error('Rejection reason is required when rejecting verification');
  }

  return {
    ...session,
    status: decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'returned',
    completedAt: new Date(),
    decision,
    notes: notes ?? null,
    rejectionReason: rejectionReason ?? null,
    checklistCompleted: true,
  };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const VerificationChecklistSchema = z.object({
  patientNameCorrect: z.boolean(),
  patientDobCorrect: z.boolean(),
  patientAddressCorrect: z.boolean(),
  patientAllergiesReviewed: z.boolean(),
  prescriberCorrect: z.boolean(),
  drugCorrect: z.boolean(),
  strengthCorrect: z.boolean(),
  dosageFormCorrect: z.boolean(),
  quantityCorrect: z.boolean(),
  daysSupplyCorrect: z.boolean(),
  directionsCorrect: z.boolean(),
  refillsCorrect: z.boolean(),
  dawCodeCorrect: z.boolean(),
  durAlertsReviewed: z.boolean(),
  interactionsCleared: z.boolean(),
  allergiesCleared: z.boolean(),
  dosageAppropriate: z.boolean(),
  duplicateTherapyCleared: z.boolean(),
  ndcVerified: z.boolean(),
  lotNumberRecorded: z.boolean(),
  expirationValid: z.boolean(),
  quantityInVialCorrect: z.boolean(),
  labelCorrect: z.boolean(),
  auxiliaryLabelsCorrect: z.boolean(),
  packagingAppropriate: z.boolean(),
  appearanceCorrect: z.boolean(),
  deaScheduleVerified: z.boolean().nullable(),
  pdmpReviewed: z.boolean().nullable(),
  idRequirementNoted: z.boolean().nullable(),
});

export const DurOverrideInputSchema = z.object({
  durAlertId: z.string(),
  overrideCode: z.string(),
  overrideReason: z.string().min(10),
});

export const VerificationDecisionSchema = z.enum(['approved', 'rejected', 'returned_for_rework']);

export const CompleteVerificationSchema = z.object({
  sessionId: z.string(),
  decision: VerificationDecisionSchema,
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
}).refine(
  (data): boolean => data.decision !== 'rejected' || !!data.rejectionReason,
  { message: 'Rejection reason is required when rejecting' }
);
