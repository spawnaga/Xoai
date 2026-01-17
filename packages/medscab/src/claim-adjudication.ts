/**
 * Claim Adjudication Module
 *
 * Handles insurance claim workflow, rejection resolution,
 * and cash pricing for retail pharmacy dispensing.
 */

import { z } from 'zod';
import type { ClaimRequest, ClaimResponse, RejectCode, InsuranceInfo } from './claims';
import { REJECT_CODES, DAW_CODES, submitClaim, parseRejectCodes } from './claims';

// ============================================
// CLAIM ADJUDICATION TYPES
// ============================================

export interface ClaimAdjudicationSession {
  id: string;
  prescriptionId: string;
  fillId: string;
  status: ClaimAdjudicationStatus;

  // Insurance Info
  insurancePlanId: string | null;
  bin: string | null;
  pcn: string | null;
  groupNumber: string | null;
  memberId: string | null;

  // Submission History
  attempts: ClaimAttempt[];
  currentAttempt: number;

  // Resolution
  resolution: ClaimResolution | null;
  resolvedAt: Date | null;
  resolvedById: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type ClaimAdjudicationStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'resolved'
  | 'cash'
  | 'prior_auth_needed'
  | 'appealing';

export interface ClaimAttempt {
  attemptNumber: number;
  submittedAt: Date;
  response: ClaimResponse | null;
  rejectCodes: string[];
  resolution: ClaimResolutionAction | null;
  notes: string | null;
}

export type ClaimResolution =
  | 'approved' // Claim paid
  | 'cash' // Patient paying cash
  | 'adjusted' // Adjusted and resubmitted
  | 'prior_auth' // Prior auth obtained
  | 'formulary_switch' // Switched to formulary drug
  | 'cancelled' // Prescription cancelled
  | 'third_party'; // Secondary insurance paid

export type ClaimResolutionAction =
  | 'resubmit'
  | 'override'
  | 'prior_auth'
  | 'formulary_switch'
  | 'cash_conversion'
  | 'patient_contact'
  | 'prescriber_contact'
  | 'manual_reversal';

// ============================================
// REJECT CODE RESOLUTION
// ============================================

export interface RejectCodeResolution {
  code: string;
  description: string;
  category: string;
  commonCauses: string[];
  resolutionSteps: string[];
  requiresPharmacist: boolean;
  canOverride: boolean;
  overrideCodes: OverrideCode[];
  escalationRequired: boolean;
}

export interface OverrideCode {
  code: string;
  description: string;
  requiresDocumentation: boolean;
}

/**
 * Common override codes for pharmacy claims
 */
export const OVERRIDE_CODES: Record<string, OverrideCode[]> = {
  // DUR overrides (Professional Service Codes)
  DUR: [
    { code: 'M0', description: 'Prescriber consulted', requiresDocumentation: true },
    { code: 'P0', description: 'Patient consulted', requiresDocumentation: false },
    { code: '1A', description: 'Filled as directed - prescriber aware', requiresDocumentation: true },
    { code: '2A', description: 'Prescriber authorization obtained', requiresDocumentation: true },
    { code: '3A', description: 'Drug therapy unchanged', requiresDocumentation: false },
    { code: '5A', description: 'Therapy appropriate per clinical judgment', requiresDocumentation: true },
    { code: '6A', description: 'Therapy appropriate per literature', requiresDocumentation: true },
  ],

  // Early refill overrides
  EARLY_REFILL: [
    { code: 'VS', description: 'Vacation supply', requiresDocumentation: false },
    { code: 'LTC', description: 'Long term care', requiresDocumentation: false },
    { code: 'EM', description: 'Emergency supply', requiresDocumentation: true },
    { code: 'LS', description: 'Lost/Stolen medication', requiresDocumentation: true },
    { code: 'HM', description: 'Hospitalization/Medical procedure', requiresDocumentation: true },
    { code: 'DS', description: 'Dosage change', requiresDocumentation: true },
  ],

  // Quantity limit overrides
  QUANTITY: [
    { code: 'QL', description: 'Quantity limit override', requiresDocumentation: true },
    { code: 'DS', description: 'Days supply limit override', requiresDocumentation: true },
    { code: 'PA', description: 'Prior authorization on file', requiresDocumentation: true },
  ],
};

/**
 * Get resolution guidance for a reject code
 */
export function getRejectCodeResolution(code: string): RejectCodeResolution | null {
  const baseInfo = REJECT_CODES[code];
  if (!baseInfo) return null;

  const resolutions: Record<string, Partial<RejectCodeResolution>> = {
    '70': {
      commonCauses: [
        'Drug not on formulary',
        'Drug requires step therapy',
        'Drug is excluded from plan',
      ],
      resolutionSteps: [
        'Check formulary for therapeutic alternatives',
        'Contact prescriber for alternative medication',
        'Submit prior authorization if step therapy required',
        'Convert to cash if patient declines alternatives',
      ],
      requiresPharmacist: true,
      canOverride: false,
      overrideCodes: [],
      escalationRequired: true,
    },
    '75': {
      commonCauses: [
        'Drug requires prior authorization',
        'Prior auth expired',
        'Prior auth number not submitted',
      ],
      resolutionSteps: [
        'Check if prior auth exists in system',
        'Submit prior auth request to PBM',
        'Use Prior Auth phone number on card',
        'Contact prescriber for clinical documentation',
      ],
      requiresPharmacist: true,
      canOverride: true,
      overrideCodes: OVERRIDE_CODES.QUANTITY,
      escalationRequired: true,
    },
    '76': {
      commonCauses: [
        'Quantity exceeds plan limit',
        'Days supply exceeds plan limit',
        'Annual limit reached',
      ],
      resolutionSteps: [
        'Check plan quantity limits',
        'Reduce quantity to plan limit',
        'Submit override with documentation',
        'Contact plan for override authorization',
      ],
      requiresPharmacist: false,
      canOverride: true,
      overrideCodes: OVERRIDE_CODES.QUANTITY,
      escalationRequired: false,
    },
    '79': {
      commonCauses: [
        'Refill requested before 80% used',
        'Early refill - quantity on hand',
        'Insurance edit - too soon',
      ],
      resolutionSteps: [
        'Calculate eligible refill date',
        'Apply vacation supply override if applicable',
        'Document emergency need if applicable',
        'Wait until eligible date',
      ],
      requiresPharmacist: false,
      canOverride: true,
      overrideCodes: OVERRIDE_CODES.EARLY_REFILL,
      escalationRequired: false,
    },
    '88': {
      commonCauses: [
        'Drug-drug interaction detected',
        'Therapeutic duplication',
        'Age/gender conflict',
        'Allergy alert',
      ],
      resolutionSteps: [
        'Review DUR alert details',
        'Consult with prescriber if needed',
        'Apply professional service override code',
        'Document clinical rationale',
      ],
      requiresPharmacist: true,
      canOverride: true,
      overrideCodes: OVERRIDE_CODES.DUR,
      escalationRequired: false,
    },
    'MR': {
      commonCauses: [
        'Invalid prescriber NPI',
        'Prescriber not enrolled with plan',
        'DEA number required for controlled substance',
      ],
      resolutionSteps: [
        'Verify prescriber NPI in NPPES',
        'Confirm DEA number for controlled substances',
        'Contact prescriber for correct information',
        'Update prescriber record',
      ],
      requiresPharmacist: false,
      canOverride: false,
      overrideCodes: [],
      escalationRequired: true,
    },
    '7': {
      commonCauses: [
        'Member ID does not match plan records',
        'Cardholder ID entered incorrectly',
        'Plan requires different ID format',
      ],
      resolutionSteps: [
        'Verify member ID on insurance card',
        'Check for leading zeros or spaces',
        'Try alternative ID formats',
        'Contact plan to verify member ID',
      ],
      requiresPharmacist: false,
      canOverride: false,
      overrideCodes: [],
      escalationRequired: false,
    },
    '65': {
      commonCauses: [
        'Patient not enrolled in plan',
        'Coverage terminated',
        'Effective date not reached',
      ],
      resolutionSteps: [
        'Verify patient eligibility dates',
        'Check for secondary insurance',
        'Contact plan to verify coverage',
        'Convert to cash if no coverage',
      ],
      requiresPharmacist: false,
      canOverride: false,
      overrideCodes: [],
      escalationRequired: true,
    },
  };

  const resolution = resolutions[code];
  if (!resolution) {
    return {
      code: baseInfo.code,
      description: baseInfo.description,
      category: baseInfo.category,
      commonCauses: ['Unknown - contact PBM help desk'],
      resolutionSteps: ['Review reject code', 'Contact PBM help desk'],
      requiresPharmacist: true,
      canOverride: false,
      overrideCodes: [],
      escalationRequired: true,
    };
  }

  return {
    code: baseInfo.code,
    description: baseInfo.description,
    category: baseInfo.category,
    commonCauses: resolution.commonCauses ?? [],
    resolutionSteps: resolution.resolutionSteps ?? [],
    requiresPharmacist: resolution.requiresPharmacist ?? true,
    canOverride: resolution.canOverride ?? false,
    overrideCodes: resolution.overrideCodes ?? [],
    escalationRequired: resolution.escalationRequired ?? true,
  };
}

// ============================================
// CLAIM WORKFLOW FUNCTIONS
// ============================================

/**
 * Submit claim for prescription
 */
export async function submitClaimForPrescription(
  request: ClaimRequest
): Promise<ClaimSubmissionResult> {
  try {
    const response = await submitClaim(request);

    const result: ClaimSubmissionResult = {
      success: response.status === 'paid',
      response,
      rejectCodes: response.rejectCodes ?? [],
      resolutionGuidance: [],
    };

    // Add resolution guidance for each reject code
    if (response.rejectCodes) {
      for (const reject of response.rejectCodes) {
        const guidance = getRejectCodeResolution(reject.code);
        if (guidance) {
          result.resolutionGuidance.push(guidance);
        }
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      response: null,
      rejectCodes: [],
      resolutionGuidance: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface ClaimSubmissionResult {
  success: boolean;
  response: ClaimResponse | null;
  rejectCodes: RejectCode[];
  resolutionGuidance: RejectCodeResolution[];
  error?: string;
}

/**
 * Resubmit claim with override codes
 */
export async function resubmitWithOverride(
  originalRequest: ClaimRequest,
  overrideCode: string,
  overrideReason?: string
): Promise<ClaimSubmissionResult> {
  // Add override to claim
  const modifiedRequest: ClaimRequest = {
    ...originalRequest,
    submissionClarificationCode: overrideCode,
  };

  // Submit with override
  return submitClaimForPrescription(modifiedRequest);
}

/**
 * Calculate eligible refill date based on last fill
 */
export function calculateEligibleRefillDate(
  lastFillDate: Date,
  daysSupply: number,
  percentageRequired: number = 80
): EligibleRefillInfo {
  const eligibleDate = new Date(lastFillDate);
  const daysToWait = Math.floor(daysSupply * (percentageRequired / 100));
  eligibleDate.setDate(eligibleDate.getDate() + daysToWait);

  const today = new Date();
  const daysUntilEligible = Math.ceil(
    (eligibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    eligibleDate,
    daysUntilEligible: Math.max(0, daysUntilEligible),
    isEligible: daysUntilEligible <= 0,
    lastFillDate,
    daysSupply,
    percentageRequired,
  };
}

export interface EligibleRefillInfo {
  eligibleDate: Date;
  daysUntilEligible: number;
  isEligible: boolean;
  lastFillDate: Date;
  daysSupply: number;
  percentageRequired: number;
}

// ============================================
// CASH PRICING
// ============================================

/**
 * Calculate cash price for prescription
 */
export function calculateCashPrice(
  acquisitionCost: number,
  dispensingFee: number,
  markupPercentage: number = 20,
  minimumPrice: number = 5
): CashPriceCalculation {
  const markup = acquisitionCost * (markupPercentage / 100);
  const calculatedPrice = acquisitionCost + markup + dispensingFee;
  const finalPrice = Math.max(calculatedPrice, minimumPrice);

  return {
    acquisitionCost,
    markup,
    dispensingFee,
    calculatedPrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    savings: 0, // Compare to AWP if available
  };
}

export interface CashPriceCalculation {
  acquisitionCost: number;
  markup: number;
  dispensingFee: number;
  calculatedPrice: number;
  finalPrice: number;
  savings: number;
}

/**
 * Compare insurance price to cash price
 */
export function comparePricingOptions(
  insurancePatientPay: number | null,
  cashPrice: number
): PricingComparison {
  if (insurancePatientPay === null) {
    return {
      recommendCash: true,
      insurancePatientPay: null,
      cashPrice,
      savings: 0,
      recommendation: 'Insurance not available - cash price applies',
    };
  }

  const savings = insurancePatientPay - cashPrice;
  const recommendCash = cashPrice < insurancePatientPay;

  let recommendation: string;
  if (recommendCash) {
    recommendation = `Cash price is $${savings.toFixed(2)} cheaper than insurance`;
  } else if (savings < 0) {
    recommendation = `Insurance saves patient $${Math.abs(savings).toFixed(2)}`;
  } else {
    recommendation = 'Prices are equal';
  }

  return {
    recommendCash,
    insurancePatientPay,
    cashPrice,
    savings: Math.abs(savings),
    recommendation,
  };
}

export interface PricingComparison {
  recommendCash: boolean;
  insurancePatientPay: number | null;
  cashPrice: number;
  savings: number;
  recommendation: string;
}

// ============================================
// PRIOR AUTHORIZATION
// ============================================

export interface PriorAuthRequest {
  id: string;
  prescriptionId: string;
  patientId: string;
  insurancePlanId: string;
  drugNdc: string;
  drugName: string;

  // Prescriber Info
  prescriberId: string;
  prescriberName: string;
  prescriberNpi: string;
  prescriberPhone: string;
  prescriberFax: string;

  // Clinical Info
  diagnosis: string | null;
  icd10Codes: string[];
  previousTherapies: string[];
  clinicalNotes: string | null;

  // Status
  status: PriorAuthStatus;
  submittedAt: Date | null;
  approvedAt: Date | null;
  deniedAt: Date | null;
  expirationDate: Date | null;

  // Authorization
  authorizationNumber: string | null;
  authorizedQuantity: number | null;
  authorizedRefills: number | null;

  // Denial
  denialReason: string | null;
  appealDeadline: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type PriorAuthStatus =
  | 'draft'
  | 'pending_info'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'denied'
  | 'appealing'
  | 'expired';

/**
 * Check if prior auth is still valid
 */
export function isPriorAuthValid(pa: PriorAuthRequest): boolean {
  if (pa.status !== 'approved') return false;
  if (!pa.expirationDate) return true;
  return pa.expirationDate > new Date();
}

/**
 * Calculate days until PA expiration
 */
export function getDaysUntilPAExpiration(pa: PriorAuthRequest): number | null {
  if (!pa.expirationDate) return null;

  const today = new Date();
  const daysRemaining = Math.ceil(
    (pa.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const ClaimAdjudicationStatusSchema = z.enum([
  'pending',
  'submitted',
  'approved',
  'rejected',
  'resolved',
  'cash',
  'prior_auth_needed',
  'appealing',
]);

export const ClaimResolutionActionSchema = z.enum([
  'resubmit',
  'override',
  'prior_auth',
  'formulary_switch',
  'cash_conversion',
  'patient_contact',
  'prescriber_contact',
  'manual_reversal',
]);

export const OverrideSubmissionSchema = z.object({
  prescriptionId: z.string(),
  overrideCode: z.string(),
  overrideReason: z.string().optional(),
  documentationProvided: z.boolean().default(false),
});

export const CashConversionSchema = z.object({
  prescriptionId: z.string(),
  acquisitionCost: z.number().nonnegative(),
  dispensingFee: z.number().nonnegative(),
  markupPercentage: z.number().min(0).max(100).default(20),
  patientConsent: z.boolean(),
});

export const PriorAuthRequestSchema = z.object({
  prescriptionId: z.string(),
  patientId: z.string(),
  insurancePlanId: z.string(),
  drugNdc: z.string(),
  drugName: z.string(),
  prescriberId: z.string(),
  diagnosis: z.string().optional(),
  icd10Codes: z.array(z.string()).optional(),
  previousTherapies: z.array(z.string()).optional(),
  clinicalNotes: z.string().optional(),
});
