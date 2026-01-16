/**
 * PDMP (Prescription Drug Monitoring Program) Integration Module
 *
 * Provides integration with state PDMP systems for controlled substance monitoring:
 * - PDMP queries and result handling
 * - Risk scoring and alerting
 * - Multi-state queries via PMP InterConnect
 * - Compliance tracking and reporting
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * PDMP provider options
 */
export type PDMPProvider = 'bamboo_health' | 'appriss' | 'state_direct';

/**
 * Query request reason
 */
export type PDMPQueryReason = 'dispensing' | 'review' | 'audit' | 'clinical';

/**
 * Payment type for prescriptions
 */
export type PaymentType = 'insurance' | 'cash' | 'medicaid' | 'medicare' | 'other';

/**
 * PDMP alert type
 */
export type PDMPAlertType =
  | 'early_refill'
  | 'multiple_prescribers'
  | 'multiple_pharmacies'
  | 'high_mme'
  | 'dangerous_combo'
  | 'doctor_shopping'
  | 'overlapping_prescriptions'
  | 'high_quantity'
  | 'cash_only'
  | 'long_distance_prescriber';

/**
 * Alert severity level
 */
export type PDMPAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * PDMP query status
 */
export type PDMPQueryStatus = 'pending' | 'completed' | 'failed' | 'timeout' | 'partial';

/**
 * PDMP query input
 */
export interface PDMPQuery {
  patientFirstName: string;
  patientLastName: string;
  patientDOB: Date;
  patientState: string;
  patientZip?: string;
  patientGender?: 'M' | 'F' | 'U';
  patientSSN4?: string; // Last 4 digits
  pharmacyDEA: string;
  pharmacyNPI: string;
  requestedBy: string;
  requestedByRole: string;
  requestReason: PDMPQueryReason;
  prescriptionId?: string;
  drugName?: string;
  deaSchedule?: string;
  additionalStates?: string[]; // For PMP InterConnect
}

/**
 * PDMP prescription history record
 */
export interface PDMPPrescription {
  dispensedDate: Date;
  writtenDate?: Date;
  drugName: string;
  drugNDC?: string;
  deaSchedule: string;
  quantity: number;
  daysSupply: number;
  metricQuantity?: number;
  mmePerDay?: number;
  refillNumber: number;
  prescriberName: string;
  prescriberDEA: string;
  prescriberNPI?: string;
  prescriberSpecialty?: string;
  pharmacyName: string;
  pharmacyDEA: string;
  pharmacyNPI?: string;
  pharmacyAddress?: string;
  paymentType: PaymentType;
  partialFill?: boolean;
  transmissionDate?: Date;
}

/**
 * PDMP alert
 */
export interface PDMPAlert {
  id: string;
  type: PDMPAlertType;
  severity: PDMPAlertSeverity;
  title: string;
  description: string;
  details?: string;
  recommendation: string;
  relatedPrescriptions?: string[]; // References to PDMPPrescription entries
  metrics?: Record<string, number | string>;
  requiresAction: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  acknowledgeNotes?: string;
}

/**
 * PDMP query result
 */
export interface PDMPResult {
  queryId: string;
  status: PDMPQueryStatus;
  queriedAt: Date;
  completedAt?: Date;
  responseTimeMs?: number;

  // Provider info
  provider: PDMPProvider;
  source: 'state' | 'pmp_interconnect';
  statesQueried: string[];
  statesResponded: string[];
  statesFailed?: string[];

  // Patient matching
  patientMatched: boolean;
  matchConfidence?: number; // 0-100

  // Prescription history
  history: PDMPPrescription[];
  totalPrescriptions: number;
  controlledSubstanceCount: number;
  historyStartDate?: Date;
  historyEndDate?: Date;
  historyMonths: number;

  // Risk analysis
  alerts: PDMPAlert[];
  alertCount: number;
  criticalAlertCount: number;
  riskScore?: number; // 0-100
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical';

  // Pattern detection
  multiplePrescribers: boolean;
  prescriberCount: number;
  multiplePharmacies: boolean;
  pharmacyCount: number;
  earlyRefillAttempts: number;
  cashOnlyCount: number;
  overlappingDays: number;
  totalMME?: number;
  averageMMEPerDay?: number;

  // Review status
  requiresPharmacistReview: boolean;
  reviewReasons: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  reviewDecision?: 'approve' | 'deny' | 'investigate';

  // Errors
  errors?: string[];
  warnings?: string[];
}

/**
 * PDMP query audit entry
 */
export interface PDMPAuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  queryId?: string;
  patientId?: string;
  details?: string;
}

/**
 * MME calculation input
 */
export interface MMECalculationInput {
  drugName: string;
  strength: number;
  strengthUnit: string;
  quantity: number;
  daysSupply: number;
}

/**
 * MME calculation result
 */
export interface MMECalculationResult {
  dailyDose: number;
  mmeConversionFactor: number;
  dailyMME: number;
  totalMME: number;
  isHighDose: boolean;
  warningThreshold: number;
  dangerThreshold: number;
}

// ============================================
// SCHEMAS
// ============================================

export const PDMPQuerySchema = z.object({
  patientFirstName: z.string().min(1),
  patientLastName: z.string().min(1),
  patientDOB: z.date(),
  patientState: z.string().length(2),
  patientZip: z.string().optional(),
  patientGender: z.enum(['M', 'F', 'U']).optional(),
  patientSSN4: z.string().length(4).optional(),
  pharmacyDEA: z.string().length(9),
  pharmacyNPI: z.string().length(10),
  requestedBy: z.string().min(1),
  requestedByRole: z.string().min(1),
  requestReason: z.enum(['dispensing', 'review', 'audit', 'clinical']),
  prescriptionId: z.string().optional(),
  drugName: z.string().optional(),
  deaSchedule: z.string().optional(),
  additionalStates: z.array(z.string().length(2)).optional(),
});

export const PDMPAlertSchema = z.object({
  id: z.string(),
  type: z.enum([
    'early_refill',
    'multiple_prescribers',
    'multiple_pharmacies',
    'high_mme',
    'dangerous_combo',
    'doctor_shopping',
    'overlapping_prescriptions',
    'high_quantity',
    'cash_only',
    'long_distance_prescriber',
  ]),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  description: z.string(),
  details: z.string().optional(),
  recommendation: z.string(),
  relatedPrescriptions: z.array(z.string()).optional(),
  metrics: z.record(z.union([z.number(), z.string()])).optional(),
  requiresAction: z.boolean(),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional(),
  acknowledgeNotes: z.string().optional(),
});

export const PDMPResultSchema = z.object({
  queryId: z.string(),
  status: z.enum(['pending', 'completed', 'failed', 'timeout', 'partial']),
  queriedAt: z.date(),
  completedAt: z.date().optional(),
  responseTimeMs: z.number().optional(),
  provider: z.enum(['bamboo_health', 'appriss', 'state_direct']),
  source: z.enum(['state', 'pmp_interconnect']),
  statesQueried: z.array(z.string()),
  statesResponded: z.array(z.string()),
  statesFailed: z.array(z.string()).optional(),
  patientMatched: z.boolean(),
  matchConfidence: z.number().min(0).max(100).optional(),
  totalPrescriptions: z.number(),
  controlledSubstanceCount: z.number(),
  historyMonths: z.number(),
  alertCount: z.number(),
  criticalAlertCount: z.number(),
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(['low', 'moderate', 'high', 'critical']).optional(),
  multiplePrescribers: z.boolean(),
  prescriberCount: z.number(),
  multiplePharmacies: z.boolean(),
  pharmacyCount: z.number(),
  earlyRefillAttempts: z.number(),
  cashOnlyCount: z.number(),
  overlappingDays: z.number(),
  totalMME: z.number().optional(),
  averageMMEPerDay: z.number().optional(),
  requiresPharmacistReview: z.boolean(),
  reviewReasons: z.array(z.string()),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Alert type display names and descriptions
 */
export const PDMP_ALERT_INFO: Record<
  PDMPAlertType,
  { name: string; description: string; defaultSeverity: PDMPAlertSeverity }
> = {
  early_refill: {
    name: 'Early Refill',
    description: 'Patient is attempting to fill a prescription before the expected date',
    defaultSeverity: 'warning',
  },
  multiple_prescribers: {
    name: 'Multiple Prescribers',
    description: 'Patient has received controlled substances from multiple prescribers',
    defaultSeverity: 'warning',
  },
  multiple_pharmacies: {
    name: 'Multiple Pharmacies',
    description: 'Patient has filled controlled substances at multiple pharmacies',
    defaultSeverity: 'warning',
  },
  high_mme: {
    name: 'High MME',
    description: 'Patient morphine milligram equivalent (MME) exceeds safety threshold',
    defaultSeverity: 'critical',
  },
  dangerous_combo: {
    name: 'Dangerous Combination',
    description: 'Patient has overlapping opioid and benzodiazepine prescriptions',
    defaultSeverity: 'critical',
  },
  doctor_shopping: {
    name: 'Doctor Shopping Pattern',
    description: 'Pattern suggests intentional seeking of multiple prescribers',
    defaultSeverity: 'critical',
  },
  overlapping_prescriptions: {
    name: 'Overlapping Prescriptions',
    description: 'Patient has overlapping days supply for similar medications',
    defaultSeverity: 'warning',
  },
  high_quantity: {
    name: 'High Quantity',
    description: 'Prescription quantity exceeds typical limits',
    defaultSeverity: 'info',
  },
  cash_only: {
    name: 'Cash Only Pattern',
    description: 'Multiple prescriptions paid with cash instead of insurance',
    defaultSeverity: 'info',
  },
  long_distance_prescriber: {
    name: 'Long Distance Prescriber',
    description: 'Prescriber is located far from patient residence',
    defaultSeverity: 'info',
  },
};

/**
 * MME conversion factors for common opioids
 * Based on CDC guidelines
 */
export const MME_CONVERSION_FACTORS: Record<string, number> = {
  codeine: 0.15,
  fentanyl_transdermal_mcg_hr: 2.4, // mcg/hr to MME
  hydrocodone: 1,
  hydromorphone: 4,
  methadone_1_20_mg: 4,
  methadone_21_40_mg: 8,
  methadone_41_60_mg: 10,
  methadone_61_plus_mg: 12,
  morphine: 1,
  oxycodone: 1.5,
  oxymorphone: 3,
  tapentadol: 0.4,
  tramadol: 0.1,
  buprenorphine_transdermal: 12.6,
  buprenorphine_sublingual: 30,
};

/**
 * MME thresholds (CDC guidelines)
 */
export const MME_THRESHOLDS = {
  /** CDC recommends caution at 50 MME/day */
  WARNING: 50,
  /** CDC recommends avoiding or justifying at 90 MME/day */
  DANGER: 90,
  /** Very high risk threshold */
  CRITICAL: 120,
};

/**
 * Default number of prescribers/pharmacies to trigger alert
 */
export const PATTERN_THRESHOLDS = {
  /** Number of prescribers in 90 days to trigger alert */
  PRESCRIBER_COUNT: 4,
  /** Number of pharmacies in 90 days to trigger alert */
  PHARMACY_COUNT: 4,
  /** Percentage of days supply remaining to allow refill */
  EARLY_REFILL_THRESHOLD: 80,
  /** Number of cash transactions to trigger alert */
  CASH_ONLY_COUNT: 3,
  /** Days of overlap to trigger alert */
  OVERLAP_DAYS: 7,
};

/**
 * Risk score weights
 */
export const RISK_SCORE_WEIGHTS = {
  multiplePrescribers: 15,
  multiplePharmacies: 15,
  highMME: 25,
  dangerousCombo: 30,
  earlyRefill: 10,
  cashOnly: 5,
  overlapping: 10,
  doctorShopping: 30,
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate PDMP query ID
 */
export function generateQueryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PDMP-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate alert ID
 */
export function generateAlertId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ALERT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Calculate MME for a medication
 */
export function calculateMME(input: MMECalculationInput): MMECalculationResult {
  const drugNameLower = input.drugName.toLowerCase();

  // Find matching conversion factor
  let conversionFactor = 0;
  for (const [drug, factor] of Object.entries(MME_CONVERSION_FACTORS)) {
    const drugParts = drug.replace(/_/g, ' ').split(' ');
    const drugMatch = drugParts[0] ?? '';
    if (drugMatch && drugNameLower.includes(drugMatch)) {
      conversionFactor = factor;
      break;
    }
  }

  // Special handling for methadone (dose-dependent)
  if (drugNameLower.includes('methadone')) {
    if (input.strength <= 20) {
      conversionFactor = MME_CONVERSION_FACTORS['methadone_1_20_mg'] ?? 4;
    } else if (input.strength <= 40) {
      conversionFactor = MME_CONVERSION_FACTORS['methadone_21_40_mg'] ?? 8;
    } else if (input.strength <= 60) {
      conversionFactor = MME_CONVERSION_FACTORS['methadone_41_60_mg'] ?? 10;
    } else {
      conversionFactor = MME_CONVERSION_FACTORS['methadone_61_plus_mg'] ?? 12;
    }
  }

  const dailyDose = (input.quantity * input.strength) / input.daysSupply;
  const dailyMME = dailyDose * conversionFactor;
  const totalMME = input.quantity * input.strength * conversionFactor;

  return {
    dailyDose,
    mmeConversionFactor: conversionFactor,
    dailyMME,
    totalMME,
    isHighDose: dailyMME >= MME_THRESHOLDS.WARNING,
    warningThreshold: MME_THRESHOLDS.WARNING,
    dangerThreshold: MME_THRESHOLDS.DANGER,
  };
}

/**
 * Calculate total daily MME from prescription history
 */
export function calculateTotalDailyMME(prescriptions: PDMPPrescription[]): number {
  const now = new Date();
  let totalMME = 0;

  for (const rx of prescriptions) {
    if (rx.mmePerDay) {
      // Check if prescription is currently active
      const endDate = new Date(rx.dispensedDate);
      endDate.setDate(endDate.getDate() + rx.daysSupply);

      if (endDate >= now) {
        totalMME += rx.mmePerDay;
      }
    }
  }

  return Math.round(totalMME * 10) / 10;
}

/**
 * Detect overlapping prescriptions
 */
export function detectOverlappingPrescriptions(
  prescriptions: PDMPPrescription[]
): { overlappingDays: number; pairs: Array<[PDMPPrescription, PDMPPrescription]> } {
  const pairs: Array<[PDMPPrescription, PDMPPrescription]> = [];
  let totalOverlapDays = 0;

  // Sort by dispensed date
  const sorted = [...prescriptions].sort(
    (a, b) => a.dispensedDate.getTime() - b.dispensedDate.getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const rx1 = sorted[i];
      const rx2 = sorted[j];

      if (!rx1 || !rx2) continue;

      // Calculate end dates
      const rx1End = new Date(rx1.dispensedDate);
      rx1End.setDate(rx1End.getDate() + rx1.daysSupply);

      const rx2Start = rx2.dispensedDate;

      // Check for overlap
      if (rx1End > rx2Start) {
        const overlapMs = rx1End.getTime() - rx2Start.getTime();
        const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));
        totalOverlapDays += overlapDays;
        pairs.push([rx1, rx2]);
      }
    }
  }

  return { overlappingDays: totalOverlapDays, pairs };
}

/**
 * Count unique prescribers
 */
export function countUniquePrescribers(prescriptions: PDMPPrescription[]): {
  count: number;
  prescribers: Array<{ name: string; dea: string; count: number }>;
} {
  const prescriberMap = new Map<string, { name: string; dea: string; count: number }>();

  for (const rx of prescriptions) {
    const key = rx.prescriberDEA;
    const existing = prescriberMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      prescriberMap.set(key, {
        name: rx.prescriberName,
        dea: rx.prescriberDEA,
        count: 1,
      });
    }
  }

  return {
    count: prescriberMap.size,
    prescribers: Array.from(prescriberMap.values()),
  };
}

/**
 * Count unique pharmacies
 */
export function countUniquePharmacies(prescriptions: PDMPPrescription[]): {
  count: number;
  pharmacies: Array<{ name: string; dea: string; count: number }>;
} {
  const pharmacyMap = new Map<string, { name: string; dea: string; count: number }>();

  for (const rx of prescriptions) {
    const key = rx.pharmacyDEA;
    const existing = pharmacyMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      pharmacyMap.set(key, {
        name: rx.pharmacyName,
        dea: rx.pharmacyDEA,
        count: 1,
      });
    }
  }

  return {
    count: pharmacyMap.size,
    pharmacies: Array.from(pharmacyMap.values()),
  };
}

/**
 * Count cash-only transactions
 */
export function countCashTransactions(prescriptions: PDMPPrescription[]): number {
  return prescriptions.filter((rx) => rx.paymentType === 'cash').length;
}

/**
 * Detect early refill attempts
 */
export function detectEarlyRefills(
  prescriptions: PDMPPrescription[],
  thresholdPercent: number = PATTERN_THRESHOLDS.EARLY_REFILL_THRESHOLD
): PDMPPrescription[] {
  const earlyRefills: PDMPPrescription[] = [];

  // Group by drug
  const drugMap = new Map<string, PDMPPrescription[]>();
  for (const rx of prescriptions) {
    const key = rx.drugNDC || rx.drugName.toLowerCase();
    const existing = drugMap.get(key);
    if (existing) {
      existing.push(rx);
    } else {
      drugMap.set(key, [rx]);
    }
  }

  // Check each drug group
  for (const rxList of drugMap.values()) {
    if (rxList.length < 2) continue;

    // Sort by dispensed date
    const sorted = [...rxList].sort(
      (a, b) => a.dispensedDate.getTime() - b.dispensedDate.getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (!prev || !curr) continue;

      // Calculate expected next fill date
      const expectedDate = new Date(prev.dispensedDate);
      expectedDate.setDate(expectedDate.getDate() + prev.daysSupply);

      // Calculate how much of the supply should have been used
      const daysBetween = Math.floor(
        (curr.dispensedDate.getTime() - prev.dispensedDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const percentUsed = (daysBetween / prev.daysSupply) * 100;

      if (percentUsed < thresholdPercent) {
        earlyRefills.push(curr);
      }
    }
  }

  return earlyRefills;
}

/**
 * Create alert from detected pattern
 */
export function createAlert(
  type: PDMPAlertType,
  severity: PDMPAlertSeverity,
  details: {
    description?: string;
    metrics?: Record<string, number | string>;
    relatedPrescriptions?: string[];
  } = {}
): PDMPAlert {
  const alertInfo = PDMP_ALERT_INFO[type];

  const recommendations: Record<PDMPAlertType, string> = {
    early_refill: 'Verify with patient the reason for early refill. Check for lost/stolen medication.',
    multiple_prescribers: 'Contact prescribers to verify treatment coordination.',
    multiple_pharmacies: 'Consider pharmacist consultation and possible pharmacy lock-in.',
    high_mme: 'Review opioid dosing. Consider naloxone prescription. Discuss tapering if appropriate.',
    dangerous_combo: 'Consult with prescriber about opioid-benzodiazepine combination risks.',
    doctor_shopping: 'Report to pharmacy supervisor. Consider PDMP mandatory check for future fills.',
    overlapping_prescriptions: 'Verify prescriptions are from same provider or coordinate care.',
    high_quantity: 'Verify quantity with prescriber. Check for appropriate days supply.',
    cash_only: 'Document reason for cash payment. Verify patient identity.',
    long_distance_prescriber: 'Verify patient-prescriber relationship and legitimacy.',
  };

  return {
    id: generateAlertId(),
    type,
    severity,
    title: alertInfo.name,
    description: details.description || alertInfo.description,
    recommendation: recommendations[type],
    metrics: details.metrics,
    relatedPrescriptions: details.relatedPrescriptions,
    requiresAction: severity === 'critical',
  };
}

/**
 * Analyze PDMP results and generate alerts
 */
export function analyzeResults(prescriptions: PDMPPrescription[]): {
  alerts: PDMPAlert[];
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  metrics: {
    prescriberCount: number;
    pharmacyCount: number;
    cashOnlyCount: number;
    overlappingDays: number;
    totalMME: number;
    earlyRefillCount: number;
  };
} {
  const alerts: PDMPAlert[] = [];
  let riskScore = 0;

  // Count unique prescribers
  const prescriberInfo = countUniquePrescribers(prescriptions);
  if (prescriberInfo.count >= PATTERN_THRESHOLDS.PRESCRIBER_COUNT) {
    alerts.push(
      createAlert('multiple_prescribers', 'warning', {
        metrics: { prescriberCount: prescriberInfo.count },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.multiplePrescribers;
  }

  // Count unique pharmacies
  const pharmacyInfo = countUniquePharmacies(prescriptions);
  if (pharmacyInfo.count >= PATTERN_THRESHOLDS.PHARMACY_COUNT) {
    alerts.push(
      createAlert('multiple_pharmacies', 'warning', {
        metrics: { pharmacyCount: pharmacyInfo.count },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.multiplePharmacies;
  }

  // Check for cash-only pattern
  const cashOnlyCount = countCashTransactions(prescriptions);
  if (cashOnlyCount >= PATTERN_THRESHOLDS.CASH_ONLY_COUNT) {
    alerts.push(
      createAlert('cash_only', 'info', {
        metrics: { cashTransactions: cashOnlyCount },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.cashOnly;
  }

  // Check for overlapping prescriptions
  const overlapInfo = detectOverlappingPrescriptions(prescriptions);
  if (overlapInfo.overlappingDays >= PATTERN_THRESHOLDS.OVERLAP_DAYS) {
    alerts.push(
      createAlert('overlapping_prescriptions', 'warning', {
        metrics: { overlappingDays: overlapInfo.overlappingDays },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.overlapping;
  }

  // Check total MME
  const totalMME = calculateTotalDailyMME(prescriptions);
  if (totalMME >= MME_THRESHOLDS.DANGER) {
    alerts.push(
      createAlert('high_mme', 'critical', {
        description: `Daily MME of ${totalMME} exceeds danger threshold of ${MME_THRESHOLDS.DANGER}`,
        metrics: { dailyMME: totalMME, threshold: MME_THRESHOLDS.DANGER },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.highMME;
  } else if (totalMME >= MME_THRESHOLDS.WARNING) {
    alerts.push(
      createAlert('high_mme', 'warning', {
        description: `Daily MME of ${totalMME} exceeds warning threshold of ${MME_THRESHOLDS.WARNING}`,
        metrics: { dailyMME: totalMME, threshold: MME_THRESHOLDS.WARNING },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.highMME / 2;
  }

  // Check for early refills
  const earlyRefills = detectEarlyRefills(prescriptions);
  if (earlyRefills.length > 0) {
    alerts.push(
      createAlert('early_refill', 'warning', {
        metrics: { earlyRefillCount: earlyRefills.length },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.earlyRefill;
  }

  // Check for doctor shopping pattern (multiple prescribers + multiple pharmacies)
  if (
    prescriberInfo.count >= PATTERN_THRESHOLDS.PRESCRIBER_COUNT &&
    pharmacyInfo.count >= PATTERN_THRESHOLDS.PHARMACY_COUNT
  ) {
    alerts.push(
      createAlert('doctor_shopping', 'critical', {
        description: `Pattern detected: ${prescriberInfo.count} prescribers and ${pharmacyInfo.count} pharmacies`,
        metrics: {
          prescriberCount: prescriberInfo.count,
          pharmacyCount: pharmacyInfo.count,
        },
      })
    );
    riskScore += RISK_SCORE_WEIGHTS.doctorShopping;
  }

  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  if (riskScore >= 60) {
    riskLevel = 'critical';
  } else if (riskScore >= 40) {
    riskLevel = 'high';
  } else if (riskScore >= 20) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'low';
  }

  return {
    alerts,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    metrics: {
      prescriberCount: prescriberInfo.count,
      pharmacyCount: pharmacyInfo.count,
      cashOnlyCount,
      overlappingDays: overlapInfo.overlappingDays,
      totalMME,
      earlyRefillCount: earlyRefills.length,
    },
  };
}

/**
 * Create a PDMP result from query response
 */
export function createPDMPResult(
  query: PDMPQuery,
  prescriptions: PDMPPrescription[],
  options: {
    provider: PDMPProvider;
    source: 'state' | 'pmp_interconnect';
    statesQueried: string[];
    statesResponded: string[];
    statesFailed?: string[];
    patientMatched: boolean;
    matchConfidence?: number;
    responseTimeMs?: number;
    historyMonths?: number;
    errors?: string[];
    warnings?: string[];
  }
): PDMPResult {
  const now = new Date();
  const analysis = analyzeResults(prescriptions);

  // Determine review requirements
  const reviewReasons: string[] = [];
  if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
    reviewReasons.push(`Risk level: ${analysis.riskLevel}`);
  }
  if (analysis.alerts.some((a) => a.severity === 'critical')) {
    reviewReasons.push('Critical alerts detected');
  }
  if (analysis.metrics.totalMME >= MME_THRESHOLDS.WARNING) {
    reviewReasons.push(`High MME: ${analysis.metrics.totalMME}`);
  }

  return {
    queryId: generateQueryId(),
    status: options.errors && options.errors.length > 0 ? 'partial' : 'completed',
    queriedAt: now,
    completedAt: now,
    responseTimeMs: options.responseTimeMs,
    provider: options.provider,
    source: options.source,
    statesQueried: options.statesQueried,
    statesResponded: options.statesResponded,
    statesFailed: options.statesFailed,
    patientMatched: options.patientMatched,
    matchConfidence: options.matchConfidence,
    history: prescriptions,
    totalPrescriptions: prescriptions.length,
    controlledSubstanceCount: prescriptions.filter((rx) => rx.deaSchedule).length,
    historyMonths: options.historyMonths || 12,
    alerts: analysis.alerts,
    alertCount: analysis.alerts.length,
    criticalAlertCount: analysis.alerts.filter((a) => a.severity === 'critical').length,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    multiplePrescribers: analysis.metrics.prescriberCount >= PATTERN_THRESHOLDS.PRESCRIBER_COUNT,
    prescriberCount: analysis.metrics.prescriberCount,
    multiplePharmacies: analysis.metrics.pharmacyCount >= PATTERN_THRESHOLDS.PHARMACY_COUNT,
    pharmacyCount: analysis.metrics.pharmacyCount,
    earlyRefillAttempts: analysis.metrics.earlyRefillCount,
    cashOnlyCount: analysis.metrics.cashOnlyCount,
    overlappingDays: analysis.metrics.overlappingDays,
    totalMME: analysis.metrics.totalMME,
    averageMMEPerDay: analysis.metrics.totalMME,
    requiresPharmacistReview: reviewReasons.length > 0,
    reviewReasons,
    errors: options.errors,
    warnings: options.warnings,
  };
}

/**
 * Acknowledge a PDMP alert
 */
export function acknowledgeAlert(
  alert: PDMPAlert,
  userId: string,
  notes?: string
): PDMPAlert {
  return {
    ...alert,
    acknowledgedBy: userId,
    acknowledgedAt: new Date(),
    acknowledgeNotes: notes,
    requiresAction: false,
  };
}

/**
 * Mark PDMP result as reviewed
 */
export function markResultReviewed(
  result: PDMPResult,
  reviewedBy: string,
  decision: 'approve' | 'deny' | 'investigate',
  notes?: string
): PDMPResult {
  return {
    ...result,
    reviewedBy,
    reviewedAt: new Date(),
    reviewDecision: decision,
    reviewNotes: notes,
    requiresPharmacistReview: false,
  };
}

/**
 * Check if PDMP query is required for a prescription
 */
export function isPDMPQueryRequired(
  deaSchedule?: string,
  stateMandates?: Record<string, string[]>
): boolean {
  if (!deaSchedule) return false;

  // All C-II through C-V typically require PDMP check
  const schedule = deaSchedule.toUpperCase().replace(/[^IVX]/g, '');
  const controlledSchedules = ['II', 'III', 'IV', 'V'];

  return controlledSchedules.includes(schedule);
}

/**
 * Format PDMP result for display
 */
export function formatPDMPSummary(result: PDMPResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('PDMP QUERY RESULTS');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`Query ID: ${result.queryId}`);
  lines.push(`Status: ${result.status.toUpperCase()}`);
  lines.push(`Queried At: ${result.queriedAt.toISOString()}`);
  lines.push(`States Checked: ${result.statesQueried.join(', ')}`);
  lines.push('');

  lines.push('RISK ASSESSMENT');
  lines.push('-'.repeat(40));
  lines.push(`Risk Score: ${result.riskScore}/100`);
  lines.push(`Risk Level: ${result.riskLevel?.toUpperCase()}`);
  lines.push(`Pharmacist Review Required: ${result.requiresPharmacistReview ? 'YES' : 'NO'}`);
  lines.push('');

  lines.push('STATISTICS');
  lines.push('-'.repeat(40));
  lines.push(`Total Prescriptions: ${result.totalPrescriptions}`);
  lines.push(`Controlled Substances: ${result.controlledSubstanceCount}`);
  lines.push(`Unique Prescribers: ${result.prescriberCount}`);
  lines.push(`Unique Pharmacies: ${result.pharmacyCount}`);
  lines.push(`Current Daily MME: ${result.totalMME || 0}`);
  lines.push(`Cash Transactions: ${result.cashOnlyCount}`);
  lines.push(`Overlapping Days: ${result.overlappingDays}`);
  lines.push('');

  if (result.alerts.length > 0) {
    lines.push('ALERTS');
    lines.push('-'.repeat(40));
    for (const alert of result.alerts) {
      const severityIcon =
        alert.severity === 'critical' ? '!!!' : alert.severity === 'warning' ? '!!' : '!';
      lines.push(`[${severityIcon}] ${alert.title}`);
      lines.push(`    ${alert.description}`);
      lines.push(`    Recommendation: ${alert.recommendation}`);
      lines.push('');
    }
  }

  if (result.reviewReasons.length > 0) {
    lines.push('REVIEW REASONS');
    lines.push('-'.repeat(40));
    for (const reason of result.reviewReasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Filter prescriptions by date range
 */
export function filterByDateRange(
  prescriptions: PDMPPrescription[],
  startDate: Date,
  endDate: Date
): PDMPPrescription[] {
  return prescriptions.filter(
    (rx) => rx.dispensedDate >= startDate && rx.dispensedDate <= endDate
  );
}

/**
 * Filter prescriptions by DEA schedule
 */
export function filterBySchedule(
  prescriptions: PDMPPrescription[],
  schedules: string[]
): PDMPPrescription[] {
  const normalizedSchedules = schedules.map((s) =>
    s.toUpperCase().replace(/[^IVX]/g, '')
  );
  return prescriptions.filter((rx) => {
    if (!rx.deaSchedule) return false;
    const normalizedSchedule = rx.deaSchedule.toUpperCase().replace(/[^IVX]/g, '');
    return normalizedSchedules.includes(normalizedSchedule);
  });
}

/**
 * Get prescriptions from a specific prescriber
 */
export function filterByPrescriber(
  prescriptions: PDMPPrescription[],
  prescriberDEA: string
): PDMPPrescription[] {
  return prescriptions.filter((rx) => rx.prescriberDEA === prescriberDEA);
}

/**
 * Get prescriptions from a specific pharmacy
 */
export function filterByPharmacy(
  prescriptions: PDMPPrescription[],
  pharmacyDEA: string
): PDMPPrescription[] {
  return prescriptions.filter((rx) => rx.pharmacyDEA === pharmacyDEA);
}
