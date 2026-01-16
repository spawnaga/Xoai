/**
 * Insurance Claims Processing Module
 *
 * Handles pharmacy insurance billing, claims adjudication,
 * and PBM integration following NCPDP standards.
 */

import { z } from 'zod';

// ============================================
// CLAIM TYPES
// ============================================

export type ClaimStatus = 'pending' | 'submitted' | 'paid' | 'rejected' | 'reversed' | 'partial';
export type TransactionType = 'B1' | 'B2' | 'B3'; // Billing, Reversal, Rebill

export interface InsuranceInfo {
  bin: string; // Bank Identification Number (6 digits)
  pcn: string; // Processor Control Number
  groupNumber: string;
  memberId: string;
  personCode: string; // 01=cardholder, 02=spouse, 03+=dependent
  cardholderName: string;
  relationshipCode: string;
  effectiveDate: Date;
  terminationDate?: Date;
}

export interface ClaimRequest {
  transactionType: TransactionType;
  prescriptionId: string;
  fillId: string;
  pharmacy: {
    npi: string;
    ncpdpId: string;
    deaNumber?: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'M' | 'F' | 'U';
  };
  insurance: InsuranceInfo;
  prescriber: {
    npi: string;
    deaNumber?: string;
    lastName: string;
    firstName: string;
  };
  drug: {
    ndc: string;
    quantity: number;
    daysSupply: number;
    dawCode: number; // 0-9 Dispense As Written codes
    compoundCode?: string;
  };
  pricing: {
    ingredientCost: number;
    dispensingFee: number;
    grossAmountDue: number;
    usualAndCustomary: number;
  };
  priorAuthNumber?: string;
  submissionClarificationCode?: string; // SCC for 340B, etc.
}

export interface ClaimResponse {
  transactionId: string;
  status: ClaimStatus;
  responseCode: string; // 'A' = Approved, 'R' = Rejected, 'P' = Paid
  authorizationNumber?: string;

  // Financial
  ingredientCostPaid?: number;
  dispensingFeePaid?: number;
  totalAmountPaid?: number;
  patientPayAmount?: number;
  copayAmount?: number;
  coinsuranceAmount?: number;
  deductibleAmount?: number;
  incentiveAmount?: number;

  // Reject info
  rejectCodes?: RejectCode[];

  // Additional info
  message?: string;
  durResponses?: DURResponse[];
  otherPayerInfo?: OtherPayerInfo;

  timestamp: Date;
}

export interface RejectCode {
  code: string;
  description: string;
  category: 'coverage' | 'dur' | 'prescriber' | 'patient' | 'pharmacy' | 'drug' | 'quantity' | 'other';
  actionRequired: string;
}

export interface DURResponse {
  reasonCode: string;
  clinicalSignificanceCode: string;
  otherPharmacyIndicator?: string;
  previousFillDate?: Date;
  quantityPreviouslyDispensed?: number;
  databaseIndicator?: string;
  otherPrescriberIndicator?: string;
  message?: string;
}

export interface OtherPayerInfo {
  otherPayerIdQualifier: string;
  otherPayerId: string;
  otherPayerAmountPaid: number;
  otherPayerDate: Date;
}

// ============================================
// COMMON REJECT CODES DATABASE
// ============================================

export const REJECT_CODES: Record<string, RejectCode> = {
  '70': {
    code: '70',
    description: 'Product/Service Not Covered',
    category: 'coverage',
    actionRequired: 'Check formulary status, may need prior authorization or formulary alternative',
  },
  '75': {
    code: '75',
    description: 'Prior Authorization Required',
    category: 'coverage',
    actionRequired: 'Submit prior authorization request to PBM',
  },
  '76': {
    code: '76',
    description: 'Plan Limitations Exceeded',
    category: 'quantity',
    actionRequired: 'Check quantity limits, may need override or quantity reduction',
  },
  '79': {
    code: '79',
    description: 'Refill Too Soon',
    category: 'quantity',
    actionRequired: 'Wait until refill date or request vacation/emergency override',
  },
  '88': {
    code: '88',
    description: 'DUR Reject',
    category: 'dur',
    actionRequired: 'Review DUR alert and provide clinical override with reason code',
  },
  'MR': {
    code: 'MR',
    description: 'M/I Prescriber ID',
    category: 'prescriber',
    actionRequired: 'Verify prescriber NPI and DEA number',
  },
  '7': {
    code: '7',
    description: 'M/I Cardholder ID',
    category: 'patient',
    actionRequired: 'Verify member ID and person code with patient card',
  },
  '8': {
    code: '8',
    description: 'M/I Person Code',
    category: 'patient',
    actionRequired: 'Verify person code (01=cardholder, 02=spouse, etc.)',
  },
  '15': {
    code: '15',
    description: 'M/I Date of Birth',
    category: 'patient',
    actionRequired: 'Verify patient date of birth matches insurance records',
  },
  '19': {
    code: '19',
    description: 'M/I Days Supply',
    category: 'quantity',
    actionRequired: 'Verify days supply calculation matches quantity',
  },
  '22': {
    code: '22',
    description: 'M/I Quantity Dispensed',
    category: 'quantity',
    actionRequired: 'Verify quantity and metric decimal quantity',
  },
  '25': {
    code: '25',
    description: 'M/I Prescriber ID',
    category: 'prescriber',
    actionRequired: 'Verify prescriber NPI is valid and active',
  },
  '41': {
    code: '41',
    description: 'Submit Bill to Other Processor or Primary Payer',
    category: 'other',
    actionRequired: 'Bill primary insurance first or check coordination of benefits',
  },
  '65': {
    code: '65',
    description: 'Patient Not Covered',
    category: 'coverage',
    actionRequired: 'Verify patient eligibility and effective dates',
  },
  '69': {
    code: '69',
    description: 'Filled After Coverage Terminated',
    category: 'coverage',
    actionRequired: 'Verify coverage dates, patient may need to pay cash',
  },
  'ER': {
    code: 'ER',
    description: 'Early Refill - Quantity on Hand Exceeds Threshold',
    category: 'quantity',
    actionRequired: 'Wait for refill date or request override',
  },
  'MG': {
    code: 'MG',
    description: 'Drug Conflict with Preferred Product',
    category: 'drug',
    actionRequired: 'Consider therapeutic alternative on formulary',
  },
};

// ============================================
// DAW CODES
// ============================================

export const DAW_CODES: Record<number, string> = {
  0: 'No Product Selection Indicated',
  1: 'Substitution Not Allowed by Prescriber',
  2: 'Substitution Allowed - Patient Requested Product Dispensed',
  3: 'Substitution Allowed - Pharmacist Selected Product Dispensed',
  4: 'Substitution Allowed - Generic Drug Not in Stock',
  5: 'Substitution Allowed - Brand Drug Dispensed as Generic',
  6: 'Override',
  7: 'Substitution Not Allowed - Brand Drug Mandated by Law',
  8: 'Substitution Allowed - Generic Drug Not Available',
  9: 'Other',
};

// ============================================
// CLAIM PROCESSING FUNCTIONS
// ============================================

/**
 * Simulate claim submission and adjudication
 * In production, this would connect to a switch vendor (e.g., RelayHealth, Emdeon)
 */
export async function submitClaim(request: ClaimRequest): Promise<ClaimResponse> {
  // Validate request
  const validation = validateClaimRequest(request);
  if (!validation.valid) {
    return {
      transactionId: generateTransactionId(),
      status: 'rejected',
      responseCode: 'R',
      rejectCodes: validation.errors.map(e => ({
        code: e.code,
        description: e.message,
        category: 'other' as const,
        actionRequired: e.action,
      })),
      timestamp: new Date(),
    };
  }

  // Simulate adjudication logic
  const adjudicationResult = simulateAdjudication(request);

  return adjudicationResult;
}

/**
 * Submit a reversal (B2 transaction)
 */
export async function reverseClaim(
  originalClaimId: string,
  reason: string
): Promise<ClaimResponse> {
  return {
    transactionId: generateTransactionId(),
    status: 'reversed',
    responseCode: 'A',
    message: `Claim ${originalClaimId} reversed: ${reason}`,
    timestamp: new Date(),
  };
}

/**
 * Check patient eligibility
 */
export async function checkEligibility(
  insurance: InsuranceInfo,
  serviceDate: Date
): Promise<EligibilityResponse> {
  const today = new Date();
  const effectiveDate = new Date(insurance.effectiveDate);
  const termDate = insurance.terminationDate ? new Date(insurance.terminationDate) : null;

  const isEligible = serviceDate >= effectiveDate && (!termDate || serviceDate <= termDate);

  return {
    eligible: isEligible,
    effectiveDate: insurance.effectiveDate,
    terminationDate: insurance.terminationDate,
    planName: `Plan ${insurance.groupNumber}`,
    copayInfo: {
      generic: 10,
      brandPreferred: 35,
      brandNonPreferred: 60,
      specialty: 100,
    },
    deductible: {
      individual: 500,
      family: 1500,
      metAmount: 250,
    },
    message: isEligible ? 'Patient is eligible for coverage' : 'Patient is not eligible on service date',
  };
}

export interface EligibilityResponse {
  eligible: boolean;
  effectiveDate: Date;
  terminationDate?: Date;
  planName: string;
  copayInfo: {
    generic: number;
    brandPreferred: number;
    brandNonPreferred: number;
    specialty: number;
  };
  deductible: {
    individual: number;
    family: number;
    metAmount: number;
  };
  message: string;
}

/**
 * Calculate patient responsibility
 */
export function calculatePatientPay(
  totalCost: number,
  insurancePaid: number,
  copay: number,
  deductibleRemaining: number,
  coinsurancePercent: number = 0
): PatientPayCalculation {
  let patientPay = 0;
  let deductibleApplied = 0;
  let copayApplied = 0;
  let coinsuranceApplied = 0;

  // Apply deductible first
  if (deductibleRemaining > 0) {
    deductibleApplied = Math.min(totalCost, deductibleRemaining);
    patientPay += deductibleApplied;
  }

  // Then apply copay
  const remainingAfterDeductible = totalCost - deductibleApplied;
  if (remainingAfterDeductible > 0) {
    copayApplied = Math.min(copay, remainingAfterDeductible);
    patientPay += copayApplied;
  }

  // Then coinsurance if applicable
  const remainingAfterCopay = remainingAfterDeductible - copayApplied;
  if (remainingAfterCopay > 0 && coinsurancePercent > 0) {
    coinsuranceApplied = remainingAfterCopay * (coinsurancePercent / 100);
    patientPay += coinsuranceApplied;
  }

  return {
    totalCost,
    insurancePaid,
    patientPay: Math.round(patientPay * 100) / 100,
    breakdown: {
      deductible: deductibleApplied,
      copay: copayApplied,
      coinsurance: coinsuranceApplied,
    },
  };
}

export interface PatientPayCalculation {
  totalCost: number;
  insurancePaid: number;
  patientPay: number;
  breakdown: {
    deductible: number;
    copay: number;
    coinsurance: number;
  };
}

/**
 * Get reject code details
 */
export function getRejectCodeInfo(code: string): RejectCode | undefined {
  return REJECT_CODES[code.toUpperCase()];
}

/**
 * Parse reject codes from response
 */
export function parseRejectCodes(codes: string[]): RejectCode[] {
  return codes.map(code => {
    const known = REJECT_CODES[code.toUpperCase()];
    if (known) return known;
    return {
      code,
      description: `Unknown reject code: ${code}`,
      category: 'other' as const,
      actionRequired: 'Contact PBM for clarification',
    };
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; action: string }>;
}

function validateClaimRequest(request: ClaimRequest): ValidationResult {
  const errors: Array<{ code: string; message: string; action: string }> = [];

  // Validate BIN
  if (!/^\d{6}$/.test(request.insurance.bin)) {
    errors.push({
      code: '6',
      message: 'Invalid BIN format',
      action: 'BIN must be exactly 6 digits',
    });
  }

  // Validate NDC
  if (!/^\d{11}$/.test(request.drug.ndc.replace(/-/g, ''))) {
    errors.push({
      code: '7',
      message: 'Invalid NDC format',
      action: 'NDC must be 11 digits',
    });
  }

  // Validate quantity
  if (request.drug.quantity <= 0) {
    errors.push({
      code: '22',
      message: 'Invalid quantity',
      action: 'Quantity must be greater than 0',
    });
  }

  // Validate days supply
  if (request.drug.daysSupply <= 0 || request.drug.daysSupply > 365) {
    errors.push({
      code: '19',
      message: 'Invalid days supply',
      action: 'Days supply must be between 1 and 365',
    });
  }

  // Validate NPI
  if (!/^\d{10}$/.test(request.pharmacy.npi)) {
    errors.push({
      code: '56',
      message: 'Invalid pharmacy NPI',
      action: 'NPI must be exactly 10 digits',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function simulateAdjudication(request: ClaimRequest): ClaimResponse {
  // Simulate various scenarios based on input
  const rand = Math.random();

  // 85% approval rate
  if (rand < 0.85) {
    const insurancePaid = request.pricing.grossAmountDue * 0.8;
    const patientPay = request.pricing.grossAmountDue - insurancePaid;

    return {
      transactionId: generateTransactionId(),
      status: 'paid',
      responseCode: 'A',
      authorizationNumber: `AUTH-${Date.now()}`,
      ingredientCostPaid: request.pricing.ingredientCost * 0.8,
      dispensingFeePaid: request.pricing.dispensingFee,
      totalAmountPaid: insurancePaid,
      patientPayAmount: patientPay,
      copayAmount: Math.min(patientPay, 35),
      timestamp: new Date(),
    };
  }

  // 15% rejection - select random reject code
  const rejectScenarios = ['70', '75', '79', '88'];
  const selectedReject = rejectScenarios[Math.floor(Math.random() * rejectScenarios.length)];

  return {
    transactionId: generateTransactionId(),
    status: 'rejected',
    responseCode: 'R',
    rejectCodes: [REJECT_CODES[selectedReject]],
    patientPayAmount: request.pricing.grossAmountDue,
    timestamp: new Date(),
  };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const InsuranceInfoSchema = z.object({
  bin: z.string().length(6),
  pcn: z.string().max(10),
  groupNumber: z.string().max(15),
  memberId: z.string().max(20),
  personCode: z.string().max(3),
  cardholderName: z.string(),
  relationshipCode: z.string().max(2),
  effectiveDate: z.date(),
  terminationDate: z.date().optional(),
});

export const ClaimRequestSchema = z.object({
  transactionType: z.enum(['B1', 'B2', 'B3']),
  prescriptionId: z.string(),
  fillId: z.string(),
  pharmacy: z.object({
    npi: z.string().length(10),
    ncpdpId: z.string().length(7),
    deaNumber: z.string().optional(),
  }),
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.date(),
    gender: z.enum(['M', 'F', 'U']),
  }),
  insurance: InsuranceInfoSchema,
  prescriber: z.object({
    npi: z.string().length(10),
    deaNumber: z.string().optional(),
    lastName: z.string(),
    firstName: z.string(),
  }),
  drug: z.object({
    ndc: z.string(),
    quantity: z.number().positive(),
    daysSupply: z.number().min(1).max(365),
    dawCode: z.number().min(0).max(9),
    compoundCode: z.string().optional(),
  }),
  pricing: z.object({
    ingredientCost: z.number().nonnegative(),
    dispensingFee: z.number().nonnegative(),
    grossAmountDue: z.number().positive(),
    usualAndCustomary: z.number().positive(),
  }),
  priorAuthNumber: z.string().optional(),
  submissionClarificationCode: z.string().optional(),
});
