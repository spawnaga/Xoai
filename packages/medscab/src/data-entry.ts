/**
 * Data Entry Module
 *
 * Handles prescription data entry validation, drug search,
 * prescriber lookup, and SIG building for retail pharmacy.
 */

import { z } from 'zod';

// ============================================
// DATA ENTRY TYPES
// ============================================

export interface DataEntrySession {
  id: string;
  prescriptionId: string;
  intakeId: string | null;
  startedAt: Date;
  startedById: string;
  status: DataEntryStatus;

  // Patient Data
  patientId: string | null;
  patientVerified: boolean;

  // Prescriber Data
  prescriberId: string | null;
  prescriberVerified: boolean;

  // Drug Data
  drugId: string | null;
  drugNdc: string | null;
  drugVerified: boolean;

  // Prescription Data
  quantityEntered: number | null;
  daysSupplyEntered: number | null;
  directionsEntered: string | null;
  dawCode: number;
  refillsEntered: number | null;

  // Controlled Substance
  isControlled: boolean;
  deaSchedule: number | null;

  // Validation
  validationErrors: DataEntryError[];
  validationWarnings: DataEntryWarning[];

  // Completion
  completedAt: Date | null;
  completedById: string | null;
}

export type DataEntryStatus = 'in_progress' | 'pending_review' | 'completed' | 'rejected';

export interface DataEntryError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

export interface DataEntryWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

// ============================================
// DAW (Dispense As Written) CODES
// ============================================

export const DAW_CODES: Record<number, { code: number; description: string; notes: string }> = {
  0: {
    code: 0,
    description: 'No Product Selection Indicated',
    notes: 'Prescriber did not specify, substitution permitted',
  },
  1: {
    code: 1,
    description: 'Substitution Not Allowed by Prescriber',
    notes: 'Prescriber requires brand - "DAW" or "Brand Necessary"',
  },
  2: {
    code: 2,
    description: 'Substitution Allowed - Patient Requested Product Dispensed',
    notes: 'Patient requests brand when generic available',
  },
  3: {
    code: 3,
    description: 'Substitution Allowed - Pharmacist Selected Product Dispensed',
    notes: 'Pharmacist selects product within therapeutic category',
  },
  4: {
    code: 4,
    description: 'Substitution Allowed - Generic Drug Not in Stock',
    notes: 'Generic unavailable, brand dispensed',
  },
  5: {
    code: 5,
    description: 'Substitution Allowed - Brand Drug Dispensed as Generic',
    notes: 'Brand charged at generic price',
  },
  6: {
    code: 6,
    description: 'Override',
    notes: 'Plan override',
  },
  7: {
    code: 7,
    description: 'Substitution Not Allowed - Brand Drug Mandated by Law',
    notes: 'State law requires brand (narrow therapeutic index)',
  },
  8: {
    code: 8,
    description: 'Substitution Allowed - Generic Drug Not Available',
    notes: 'No generic exists in the market',
  },
  9: {
    code: 9,
    description: 'Other',
    notes: 'Other situations',
  },
};

// ============================================
// SIG (DIRECTIONS) BUILDING
// ============================================

export const SIG_COMPONENTS = {
  // Action verbs
  actions: [
    { code: 'TAKE', text: 'Take' },
    { code: 'APPLY', text: 'Apply' },
    { code: 'INJECT', text: 'Inject' },
    { code: 'INHALE', text: 'Inhale' },
    { code: 'INSERT', text: 'Insert' },
    { code: 'INSTILL', text: 'Instill' },
    { code: 'USE', text: 'Use' },
    { code: 'DISSOLVE', text: 'Dissolve' },
    { code: 'SWALLOW', text: 'Swallow' },
    { code: 'CHEW', text: 'Chew' },
  ],

  // Dose quantities
  quantities: [
    { code: '0.5', text: 'one-half' },
    { code: '1', text: 'one' },
    { code: '1.5', text: 'one and one-half' },
    { code: '2', text: 'two' },
    { code: '3', text: 'three' },
    { code: '4', text: 'four' },
    { code: '5', text: 'five' },
  ],

  // Dose forms
  forms: [
    { code: 'TAB', text: 'tablet(s)' },
    { code: 'CAP', text: 'capsule(s)' },
    { code: 'ML', text: 'mL' },
    { code: 'TSP', text: 'teaspoonful(s)' },
    { code: 'DROP', text: 'drop(s)' },
    { code: 'PUFF', text: 'puff(s)' },
    { code: 'PATCH', text: 'patch(es)' },
    { code: 'SPRAY', text: 'spray(s)' },
    { code: 'UNIT', text: 'unit(s)' },
  ],

  // Routes
  routes: [
    { code: 'PO', text: 'by mouth' },
    { code: 'TOP', text: 'topically' },
    { code: 'IM', text: 'intramuscularly' },
    { code: 'SC', text: 'subcutaneously' },
    { code: 'IV', text: 'intravenously' },
    { code: 'INH', text: 'by inhalation' },
    { code: 'SL', text: 'sublingually' },
    { code: 'PR', text: 'rectally' },
    { code: 'PV', text: 'vaginally' },
    { code: 'OD', text: 'in the right eye' },
    { code: 'OS', text: 'in the left eye' },
    { code: 'OU', text: 'in both eyes' },
    { code: 'AD', text: 'in the right ear' },
    { code: 'AS', text: 'in the left ear' },
    { code: 'AU', text: 'in both ears' },
  ],

  // Frequencies
  frequencies: [
    { code: 'QD', text: 'once daily' },
    { code: 'BID', text: 'twice daily' },
    { code: 'TID', text: 'three times daily' },
    { code: 'QID', text: 'four times daily' },
    { code: 'Q4H', text: 'every 4 hours' },
    { code: 'Q6H', text: 'every 6 hours' },
    { code: 'Q8H', text: 'every 8 hours' },
    { code: 'Q12H', text: 'every 12 hours' },
    { code: 'QHS', text: 'at bedtime' },
    { code: 'QAM', text: 'every morning' },
    { code: 'QPM', text: 'every evening' },
    { code: 'QOD', text: 'every other day' },
    { code: 'QW', text: 'once weekly' },
    { code: 'PRN', text: 'as needed' },
  ],

  // Timing/Meals
  timing: [
    { code: 'AC', text: 'before meals' },
    { code: 'PC', text: 'after meals' },
    { code: 'WF', text: 'with food' },
    { code: 'WFOA', text: 'with food or antacid' },
    { code: 'OES', text: 'on empty stomach' },
    { code: 'WW', text: 'with plenty of water' },
  ],

  // Durations
  durations: [
    { code: 'X3D', text: 'for 3 days' },
    { code: 'X5D', text: 'for 5 days' },
    { code: 'X7D', text: 'for 7 days' },
    { code: 'X10D', text: 'for 10 days' },
    { code: 'X14D', text: 'for 14 days' },
    { code: 'X30D', text: 'for 30 days' },
    { code: 'CONT', text: 'continue as directed' },
    { code: 'UD', text: 'as directed' },
  ],

  // PRN reasons
  prnReasons: [
    { code: 'PAIN', text: 'for pain' },
    { code: 'ANXY', text: 'for anxiety' },
    { code: 'SLEEP', text: 'for sleep' },
    { code: 'NAUS', text: 'for nausea' },
    { code: 'HA', text: 'for headache' },
    { code: 'COUGH', text: 'for cough' },
    { code: 'ITCH', text: 'for itching' },
    { code: 'BP', text: 'for blood pressure' },
  ],
};

/**
 * Build SIG text from components
 */
export function buildSig(components: SigComponents): string {
  const parts: string[] = [];

  // Action
  const action = SIG_COMPONENTS.actions.find(a => a.code === components.action);
  if (action) parts.push(action.text);

  // Quantity and form
  const quantity = SIG_COMPONENTS.quantities.find(q => q.code === components.quantity);
  const form = SIG_COMPONENTS.forms.find(f => f.code === components.form);
  if (quantity && form) {
    parts.push(`${quantity.text} ${form.text}`);
  } else if (components.customDose) {
    parts.push(components.customDose);
  }

  // Route
  const route = SIG_COMPONENTS.routes.find(r => r.code === components.route);
  if (route) parts.push(route.text);

  // Frequency
  const frequency = SIG_COMPONENTS.frequencies.find(f => f.code === components.frequency);
  if (frequency) parts.push(frequency.text);

  // Timing
  if (components.timing) {
    const timing = SIG_COMPONENTS.timing.find(t => t.code === components.timing);
    if (timing) parts.push(timing.text);
  }

  // PRN reason
  if (components.prnReason) {
    const reason = SIG_COMPONENTS.prnReasons.find(r => r.code === components.prnReason);
    if (reason) parts.push(reason.text);
  }

  // Duration
  if (components.duration) {
    const duration = SIG_COMPONENTS.durations.find(d => d.code === components.duration);
    if (duration) parts.push(duration.text);
  }

  // Additional instructions
  if (components.additional) {
    parts.push(components.additional);
  }

  return parts.join(' ');
}

export interface SigComponents {
  action: string;
  quantity?: string;
  form?: string;
  customDose?: string;
  route: string;
  frequency: string;
  timing?: string;
  prnReason?: string;
  duration?: string;
  additional?: string;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate prescription data entry
 */
export function validateDataEntry(data: DataEntryInput): DataEntryValidationResult {
  const errors: DataEntryError[] = [];
  const warnings: DataEntryWarning[] = [];

  // Required fields
  if (!data.patientId) {
    errors.push({
      field: 'patientId',
      code: 'REQUIRED',
      message: 'Patient is required',
      severity: 'error',
    });
  }

  if (!data.prescriberId) {
    errors.push({
      field: 'prescriberId',
      code: 'REQUIRED',
      message: 'Prescriber is required',
      severity: 'error',
    });
  }

  if (!data.drugNdc && !data.drugId) {
    errors.push({
      field: 'drug',
      code: 'REQUIRED',
      message: 'Drug selection is required',
      severity: 'error',
    });
  }

  // Quantity validation
  if (!data.quantity || data.quantity <= 0) {
    errors.push({
      field: 'quantity',
      code: 'INVALID',
      message: 'Quantity must be greater than 0',
      severity: 'error',
    });
  } else if (data.quantity > 9999) {
    warnings.push({
      field: 'quantity',
      code: 'HIGH_QUANTITY',
      message: 'Unusually high quantity - please verify',
      severity: 'warning',
    });
  }

  // Days supply validation
  if (!data.daysSupply || data.daysSupply <= 0) {
    errors.push({
      field: 'daysSupply',
      code: 'INVALID',
      message: 'Days supply must be greater than 0',
      severity: 'error',
    });
  } else if (data.daysSupply > 365) {
    errors.push({
      field: 'daysSupply',
      code: 'INVALID',
      message: 'Days supply cannot exceed 365 days',
      severity: 'error',
    });
  } else if (data.daysSupply > 90) {
    warnings.push({
      field: 'daysSupply',
      code: 'LONG_SUPPLY',
      message: 'Days supply exceeds 90 days - may require override',
      severity: 'warning',
    });
  }

  // Directions validation
  if (!data.directions || data.directions.trim().length === 0) {
    errors.push({
      field: 'directions',
      code: 'REQUIRED',
      message: 'Directions are required',
      severity: 'error',
    });
  } else if (data.directions.length < 5) {
    errors.push({
      field: 'directions',
      code: 'TOO_SHORT',
      message: 'Directions are too short - please provide complete instructions',
      severity: 'error',
    });
  }

  // Refills validation
  if (data.refills !== undefined) {
    if (data.refills < 0) {
      errors.push({
        field: 'refills',
        code: 'INVALID',
        message: 'Refills cannot be negative',
        severity: 'error',
      });
    }

    // Controlled substance refill limits
    if (data.deaSchedule === 2 && data.refills > 0) {
      errors.push({
        field: 'refills',
        code: 'C2_NO_REFILLS',
        message: 'Schedule II prescriptions cannot have refills',
        severity: 'error',
      });
    }

    if (data.deaSchedule && data.deaSchedule >= 3 && data.deaSchedule <= 5 && data.refills > 5) {
      errors.push({
        field: 'refills',
        code: 'CS_REFILL_LIMIT',
        message: 'Controlled substances (C3-C5) limited to 5 refills',
        severity: 'error',
      });
    }

    if (!data.deaSchedule && data.refills > 11) {
      warnings.push({
        field: 'refills',
        code: 'HIGH_REFILLS',
        message: 'More than 11 refills is unusual - please verify',
        severity: 'warning',
      });
    }
  }

  // DAW code validation
  if (data.dawCode !== undefined && (data.dawCode < 0 || data.dawCode > 9)) {
    errors.push({
      field: 'dawCode',
      code: 'INVALID',
      message: 'DAW code must be between 0 and 9',
      severity: 'error',
    });
  }

  // Written date validation
  if (data.writtenDate) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (data.writtenDate > today) {
      errors.push({
        field: 'writtenDate',
        code: 'FUTURE_DATE',
        message: 'Written date cannot be in the future',
        severity: 'error',
      });
    }

    // Check C2 90-day rule
    if (data.deaSchedule === 2) {
      const daysSinceWritten = Math.floor(
        (today.getTime() - data.writtenDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceWritten > 90) {
        errors.push({
          field: 'writtenDate',
          code: 'C2_EXPIRED',
          message: 'Schedule II prescription expired (>90 days from written date)',
          severity: 'error',
        });
      }
    }

    // Check C3-C5 6-month rule
    if (data.deaSchedule && data.deaSchedule >= 3 && data.deaSchedule <= 5) {
      const daysSinceWritten = Math.floor(
        (today.getTime() - data.writtenDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceWritten > 180) {
        errors.push({
          field: 'writtenDate',
          code: 'CS_EXPIRED',
          message: 'Controlled substance prescription expired (>6 months from written date)',
          severity: 'error',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface DataEntryInput {
  patientId?: string;
  prescriberId?: string;
  drugId?: string;
  drugNdc?: string;
  quantity?: number;
  daysSupply?: number;
  directions?: string;
  refills?: number;
  dawCode?: number;
  deaSchedule?: number;
  writtenDate?: Date;
}

export interface DataEntryValidationResult {
  isValid: boolean;
  errors: DataEntryError[];
  warnings: DataEntryWarning[];
}

// ============================================
// DRUG SEARCH HELPERS
// ============================================

export interface DrugSearchResult {
  id: string;
  ndc: string;
  brandName: string;
  genericName: string;
  displayName: string;
  strength: string;
  dosageForm: string;
  deaSchedule: number | null;
  isControlled: boolean;
  awpPrice: number | null;
  manufacturerName: string | null;
  requiresFridge: boolean;
  isHighAlert: boolean;
}

export interface DrugSearchParams {
  query: string;
  searchType: 'name' | 'ndc' | 'both';
  includeInactive?: boolean;
  deaScheduleFilter?: number[];
  limit?: number;
}

/**
 * Format NDC for display (5-4-2 format)
 */
export function formatNdcDisplay(ndc: string): string {
  const normalized = ndc.replace(/\D/g, '').padStart(11, '0');
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 9)}-${normalized.slice(9, 11)}`;
}

/**
 * Normalize NDC to 11-digit format
 */
export function normalizeNdc(ndc: string): string {
  return ndc.replace(/\D/g, '').padStart(11, '0');
}

/**
 * Validate NDC format
 */
export function isValidNdc(ndc: string): boolean {
  const normalized = ndc.replace(/\D/g, '');
  return normalized.length >= 10 && normalized.length <= 11;
}

// ============================================
// PRESCRIBER SEARCH HELPERS
// ============================================

export interface PrescriberSearchResult {
  id: string;
  npiNumber: string;
  deaNumber: string | null;
  firstName: string;
  lastName: string;
  suffix: string | null;
  specialty: string | null;
  practiceName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  canPrescribeCII: boolean;
  canPrescribeCIII_V: boolean;
  isVerified: boolean;
}

export interface PrescriberSearchParams {
  query: string;
  searchType: 'name' | 'npi' | 'dea' | 'all';
  state?: string;
  includeInactive?: boolean;
  limit?: number;
}

/**
 * Validate NPI number (10 digits with Luhn check)
 */
export function isValidNpi(npi: string): boolean {
  const normalized = npi.replace(/\D/g, '');
  if (normalized.length !== 10) return false;

  // NPI uses Luhn algorithm with prefix 80840
  const prefixed = '80840' + normalized;
  return luhnCheck(prefixed);
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let isDouble = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num.charAt(i), 10);

    if (isDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isDouble = !isDouble;
  }

  return sum % 10 === 0;
}

/**
 * Validate DEA number format and checksum
 */
export function isValidDeaNumber(dea: string): boolean {
  if (!dea || dea.length < 9) return false;

  const pattern = /^[A-Z][A-Z9][0-9]{7}$/i;
  if (!pattern.test(dea)) return false;

  // DEA checksum validation
  const digits = dea.substring(2);
  const odds = parseInt(digits[0]!) + parseInt(digits[2]!) + parseInt(digits[4]!);
  const evens = (parseInt(digits[1]!) + parseInt(digits[3]!) + parseInt(digits[5]!)) * 2;
  const checksum = (odds + evens) % 10;

  return checksum === parseInt(digits[6]!);
}

// ============================================
// DAYS SUPPLY CALCULATION
// ============================================

/**
 * Calculate days supply from quantity and directions
 */
export function calculateDaysSupply(
  quantity: number,
  dosesPerDay: number,
  doseQuantity: number = 1
): number {
  if (dosesPerDay <= 0 || doseQuantity <= 0) return 0;
  const dailyUsage = dosesPerDay * doseQuantity;
  return Math.floor(quantity / dailyUsage);
}

/**
 * Parse frequency code to doses per day
 */
export function frequencyToDosesPerDay(frequencyCode: string): number {
  const frequencies: Record<string, number> = {
    QD: 1,
    BID: 2,
    TID: 3,
    QID: 4,
    Q4H: 6,
    Q6H: 4,
    Q8H: 3,
    Q12H: 2,
    QHS: 1,
    QAM: 1,
    QPM: 1,
    QOD: 0.5,
    QW: 0.14,
    PRN: 1, // Assume once daily for PRN
  };

  return frequencies[frequencyCode.toUpperCase()] ?? 1;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const DataEntryInputSchema = z.object({
  patientId: z.string().optional(),
  prescriberId: z.string().optional(),
  drugId: z.string().optional(),
  drugNdc: z.string().optional(),
  quantity: z.number().positive().optional(),
  daysSupply: z.number().min(1).max(365).optional(),
  directions: z.string().min(1).max(500).optional(),
  refills: z.number().min(0).max(99).optional(),
  dawCode: z.number().min(0).max(9).optional(),
  deaSchedule: z.number().min(2).max(5).optional(),
  writtenDate: z.date().optional(),
});

export const SigComponentsSchema = z.object({
  action: z.string(),
  quantity: z.string().optional(),
  form: z.string().optional(),
  customDose: z.string().optional(),
  route: z.string(),
  frequency: z.string(),
  timing: z.string().optional(),
  prnReason: z.string().optional(),
  duration: z.string().optional(),
  additional: z.string().optional(),
});

export const DrugSearchParamsSchema = z.object({
  query: z.string().min(1),
  searchType: z.enum(['name', 'ndc', 'both']).default('both'),
  includeInactive: z.boolean().optional(),
  deaScheduleFilter: z.array(z.number()).optional(),
  limit: z.number().min(1).max(100).default(25),
});

export const PrescriberSearchParamsSchema = z.object({
  query: z.string().min(1),
  searchType: z.enum(['name', 'npi', 'dea', 'all']).default('all'),
  state: z.string().length(2).optional(),
  includeInactive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(25),
});
