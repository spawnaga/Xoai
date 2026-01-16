/**
 * Controlled Substances Tracking Module
 *
 * Handles DEA compliance, perpetual inventory for controlled substances,
 * CSOS integration, and reporting requirements.
 */

import { z } from 'zod';
import type { DEASchedule } from './types';

// ============================================
// CONTROLLED SUBSTANCE TYPES
// ============================================

export interface ControlledSubstanceRecord {
  id: string;
  pharmacyId: string;
  ndc: string;
  drugName: string;
  deaSchedule: DEASchedule;
  transactionType: CSTransactionType;
  transactionDate: Date;
  quantity: number;
  runningBalance: number;
  unit: string;
  lotNumber?: string;
  referenceType?: CSReferenceType;
  referenceId?: string;
  supplierDeaNumber?: string;
  invoiceNumber?: string;
  csosOrderId?: string;
  prescriptionNumber?: string;
  patientId?: string;
  prescriberId?: string;
  prescriberDeaNumber?: string;
  witnessUserId?: string;
  witnessName?: string;
  destructionMethod?: string;
  theftReportNumber?: string;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export type CSTransactionType =
  | 'receive' // Received from supplier
  | 'dispense' // Dispensed to patient
  | 'return_to_stock' // Returned from will-call (not picked up)
  | 'reverse_distribution' // Returned to authorized reverse distributor
  | 'destruction' // Destroyed on-site
  | 'theft_loss' // Theft or significant loss
  | 'adjustment' // Inventory adjustment
  | 'transfer_out' // Transferred to another DEA registrant
  | 'transfer_in'; // Received from another DEA registrant

export type CSReferenceType = 'prescription' | 'order' | 'dea222' | 'csos' | 'destruction' | 'theft_report' | 'adjustment';

export interface DEA222Form {
  id: string;
  formNumber: string;
  pharmacyId: string;
  pharmacyDeaNumber: string;
  supplierDeaNumber: string;
  supplierName: string;
  orderDate: Date;
  items: DEA222Item[];
  status: DEA222Status;
  receivedDate?: Date;
  receivedBy?: string;
  discrepancies?: string;
  createdAt: Date;
}

export interface DEA222Item {
  lineNumber: number;
  ndc: string;
  drugName: string;
  deaSchedule: 'II';
  quantityOrdered: number;
  quantityReceived?: number;
  unit: string;
  matchStatus?: 'matched' | 'discrepancy' | 'pending';
}

export type DEA222Status = 'draft' | 'submitted' | 'shipped' | 'partial' | 'received' | 'void';

export interface CSOSOrder {
  id: string;
  pharmacyId: string;
  pharmacyDeaNumber: string;
  supplierDeaNumber: string;
  orderDate: Date;
  digitalCertificateId: string;
  items: CSOSItem[];
  status: CSOSStatus;
  arcosReported: boolean;
  arcosReportDate?: Date;
  receivedDate?: Date;
  createdAt: Date;
}

export interface CSOSItem {
  ndc: string;
  drugName: string;
  deaSchedule: DEASchedule;
  quantityOrdered: number;
  quantityReceived?: number;
  unit: string;
}

export type CSOSStatus = 'pending' | 'transmitted' | 'acknowledged' | 'shipped' | 'received' | 'cancelled';

// ============================================
// DEA SCHEDULE RULES
// ============================================

export const CS_RULES: Record<DEASchedule, CSRules> = {
  'I': {
    schedule: 'I',
    refillsAllowed: 0,
    prescriptionValidDays: 0, // Cannot be prescribed
    partialFillAllowed: false,
    electronicPrescribingAllowed: false,
    transferAllowed: false,
    requiresDEA222: true,
    arcosReporting: true,
    perpetualInventory: true,
  },
  'II': {
    schedule: 'II',
    refillsAllowed: 0,
    prescriptionValidDays: 90,
    partialFillAllowed: true, // Under certain conditions
    partialFillTimeLimit: 72, // hours for emergency
    electronicPrescribingAllowed: true, // EPCS
    transferAllowed: true, // One-time transfer per 2023 DEA rule
    requiresDEA222: true,
    arcosReporting: true,
    perpetualInventory: true,
  },
  'III': {
    schedule: 'III',
    refillsAllowed: 5,
    prescriptionValidDays: 180,
    partialFillAllowed: true,
    electronicPrescribingAllowed: true,
    transferAllowed: true,
    requiresDEA222: false,
    arcosReporting: true,
    perpetualInventory: true,
  },
  'IV': {
    schedule: 'IV',
    refillsAllowed: 5,
    prescriptionValidDays: 180,
    partialFillAllowed: true,
    electronicPrescribingAllowed: true,
    transferAllowed: true,
    requiresDEA222: false,
    arcosReporting: true,
    perpetualInventory: true,
  },
  'V': {
    schedule: 'V',
    refillsAllowed: 5,
    prescriptionValidDays: 180,
    partialFillAllowed: true,
    electronicPrescribingAllowed: true,
    transferAllowed: true,
    requiresDEA222: false,
    arcosReporting: false,
    perpetualInventory: true,
  },
  'LEGEND': {
    schedule: 'LEGEND',
    refillsAllowed: 11,
    prescriptionValidDays: 365,
    partialFillAllowed: true,
    electronicPrescribingAllowed: true,
    transferAllowed: true,
    requiresDEA222: false,
    arcosReporting: false,
    perpetualInventory: false,
  },
  'OTC': {
    schedule: 'OTC',
    refillsAllowed: 99,
    prescriptionValidDays: 999,
    partialFillAllowed: true,
    electronicPrescribingAllowed: true,
    transferAllowed: true,
    requiresDEA222: false,
    arcosReporting: false,
    perpetualInventory: false,
  },
};

export interface CSRules {
  schedule: DEASchedule;
  refillsAllowed: number;
  prescriptionValidDays: number;
  partialFillAllowed: boolean;
  partialFillTimeLimit?: number; // hours
  electronicPrescribingAllowed: boolean;
  transferAllowed: boolean;
  requiresDEA222: boolean;
  arcosReporting: boolean;
  perpetualInventory: boolean;
}

// ============================================
// PERPETUAL INVENTORY FUNCTIONS
// ============================================

/**
 * Record a controlled substance transaction
 */
export function recordCSTransaction(
  pharmacyId: string,
  ndc: string,
  drugName: string,
  deaSchedule: DEASchedule,
  transactionType: CSTransactionType,
  quantity: number,
  currentBalance: number,
  userId: string,
  userName: string,
  options?: Partial<Omit<ControlledSubstanceRecord, 'id' | 'pharmacyId' | 'ndc' | 'drugName' | 'deaSchedule' | 'transactionType' | 'quantity' | 'runningBalance' | 'userId' | 'userName' | 'createdAt' | 'transactionDate'>>
): ControlledSubstanceRecord {
  // Calculate new running balance
  let balanceChange: number;
  switch (transactionType) {
    case 'receive':
    case 'return_to_stock':
    case 'transfer_in':
      balanceChange = quantity;
      break;
    case 'dispense':
    case 'reverse_distribution':
    case 'destruction':
    case 'theft_loss':
    case 'transfer_out':
      balanceChange = -quantity;
      break;
    case 'adjustment':
      // For adjustment, quantity represents the new count, not change
      balanceChange = quantity - currentBalance;
      break;
    default:
      balanceChange = 0;
  }

  const newBalance = Math.max(0, currentBalance + balanceChange);

  return {
    id: `CS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pharmacyId,
    ndc,
    drugName,
    deaSchedule,
    transactionType,
    transactionDate: new Date(),
    quantity: Math.abs(transactionType === 'adjustment' ? balanceChange : quantity),
    runningBalance: newBalance,
    unit: 'EA',
    userId,
    userName,
    createdAt: new Date(),
    ...options,
  };
}

/**
 * Validate controlled substance dispensing
 */
export function validateCSDispensing(
  deaSchedule: DEASchedule,
  prescriptionDate: Date,
  refillNumber: number,
  isPartialFill: boolean,
  prescriberDeaNumber?: string
): CSValidationResult {
  const rules = CS_RULES[deaSchedule];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if schedule is dispensable
  if (deaSchedule === 'I') {
    errors.push('Schedule I controlled substances cannot be dispensed in a retail setting.');
  }

  // Check prescription validity period
  const today = new Date();
  const daysSinceWritten = Math.floor((today.getTime() - prescriptionDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceWritten > rules.prescriptionValidDays) {
    errors.push(`Prescription expired. ${deaSchedule === 'II' ? 'Schedule II' : `Schedule ${deaSchedule}`} prescriptions valid for ${rules.prescriptionValidDays} days.`);
  }

  // Check refills
  if (refillNumber > rules.refillsAllowed) {
    errors.push(`Refill limit exceeded. Schedule ${deaSchedule} allows ${rules.refillsAllowed} refills.`);
  }

  // Check partial fill rules
  if (isPartialFill && !rules.partialFillAllowed) {
    errors.push(`Partial fills not allowed for Schedule ${deaSchedule}.`);
  }

  // Validate prescriber DEA
  if (!prescriberDeaNumber) {
    errors.push('Prescriber DEA number required for controlled substances.');
  } else if (!isValidDEANumber(prescriberDeaNumber)) {
    warnings.push('Prescriber DEA number format may be invalid. Verify before dispensing.');
  }

  // Schedule II specific warnings
  if (deaSchedule === 'II') {
    if (refillNumber > 0) {
      errors.push('Schedule II prescriptions cannot be refilled. New prescription required.');
    }
    warnings.push('Schedule II: Verify original prescription is electronic (EPCS) or hand-signed paper.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rules,
    requiresWitness: false,
    requiresDeaVerification: true,
  };
}

export interface CSValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rules: CSRules;
  requiresWitness: boolean;
  requiresDeaVerification: boolean;
}

/**
 * Validate DEA number format using checksum algorithm
 */
export function isValidDEANumber(deaNumber: string): boolean {
  // DEA format: 2 letters + 6 digits + 1 check digit
  if (!/^[A-Za-z]{2}\d{7}$/.test(deaNumber)) {
    return false;
  }

  // First letter must be A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, X
  const validFirstLetters = 'ABCDEFGHJKLMPRSTUX';
  if (!validFirstLetters.includes(deaNumber[0].toUpperCase())) {
    return false;
  }

  // Checksum validation
  const digits = deaNumber.slice(2).split('').map(Number);

  // Sum of 1st, 3rd, 5th digits
  const oddSum = digits[0] + digits[2] + digits[4];

  // Sum of 2nd, 4th, 6th digits * 2
  const evenSum = (digits[1] + digits[3] + digits[5]) * 2;

  // Last digit of total should equal check digit
  const checkDigit = (oddSum + evenSum) % 10;

  return checkDigit === digits[6];
}

/**
 * Generate DEA number for validation testing
 */
export function generateTestDEANumber(practitionerType: 'A' | 'B' | 'F' | 'M' = 'A', lastName: string = 'Smith'): string {
  const firstLetter = practitionerType;
  const secondLetter = lastName[0].toUpperCase();

  // Generate random 6 digits
  const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));

  // Calculate check digit
  const oddSum = digits[0] + digits[2] + digits[4];
  const evenSum = (digits[1] + digits[3] + digits[5]) * 2;
  const checkDigit = (oddSum + evenSum) % 10;

  return `${firstLetter}${secondLetter}${digits.join('')}${checkDigit}`;
}

// ============================================
// BIENNIAL INVENTORY
// ============================================

export interface BiennialInventoryRecord {
  id: string;
  pharmacyId: string;
  pharmacyDeaNumber: string;
  inventoryDate: Date;
  inventoryTime: string; // "opening" or "closing" of business
  conductedBy: string;
  witnessedBy?: string;
  items: BiennialInventoryItem[];
  totalScheduleII: number;
  totalScheduleIII: number;
  totalScheduleIV: number;
  totalScheduleV: number;
  notes?: string;
  signedDate?: Date;
  createdAt: Date;
}

export interface BiennialInventoryItem {
  ndc: string;
  drugName: string;
  deaSchedule: DEASchedule;
  dosageForm: string;
  strength: string;
  countMethod: 'exact' | 'estimated';
  quantity: number;
  unit: string;
  systemQuantity: number; // From perpetual inventory
  variance: number;
  lotNumber?: string;
  expirationDate?: Date;
  notes?: string;
}

/**
 * Calculate inventory variance
 */
export function calculateVariance(physicalCount: number, systemCount: number): VarianceResult {
  const variance = physicalCount - systemCount;
  const variancePercent = systemCount > 0 ? (variance / systemCount) * 100 : 0;

  let severity: 'none' | 'minor' | 'significant' | 'critical';
  if (variance === 0) {
    severity = 'none';
  } else if (Math.abs(variancePercent) <= 1) {
    severity = 'minor';
  } else if (Math.abs(variancePercent) <= 5) {
    severity = 'significant';
  } else {
    severity = 'critical';
  }

  return {
    physicalCount,
    systemCount,
    variance,
    variancePercent: Math.round(variancePercent * 100) / 100,
    severity,
    requiresInvestigation: severity === 'significant' || severity === 'critical',
    requiresDeaReport: severity === 'critical' && variance < 0,
  };
}

export interface VarianceResult {
  physicalCount: number;
  systemCount: number;
  variance: number;
  variancePercent: number;
  severity: 'none' | 'minor' | 'significant' | 'critical';
  requiresInvestigation: boolean;
  requiresDeaReport: boolean;
}

/**
 * Validate biennial inventory timing
 */
export function validateBiennialInventoryTiming(lastInventoryDate: Date): BiennialTimingResult {
  const today = new Date();
  const daysSinceLastInventory = Math.floor(
    (today.getTime() - lastInventoryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const twoYearsInDays = 730;

  const daysUntilDue = twoYearsInDays - daysSinceLastInventory;
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 30 && daysUntilDue > 0;

  return {
    lastInventoryDate,
    daysSinceLastInventory,
    daysUntilDue: Math.max(0, daysUntilDue),
    dueDate: new Date(lastInventoryDate.getTime() + twoYearsInDays * 24 * 60 * 60 * 1000),
    isOverdue,
    isDueSoon,
    status: isOverdue ? 'overdue' : isDueSoon ? 'due_soon' : 'current',
  };
}

export interface BiennialTimingResult {
  lastInventoryDate: Date;
  daysSinceLastInventory: number;
  daysUntilDue: number;
  dueDate: Date;
  isOverdue: boolean;
  isDueSoon: boolean;
  status: 'current' | 'due_soon' | 'overdue';
}

// ============================================
// THEFT/LOSS REPORTING
// ============================================

export interface TheftLossReport {
  id: string;
  pharmacyId: string;
  pharmacyDeaNumber: string;
  reportDate: Date;
  discoveryDate: Date;
  incidentType: 'theft' | 'loss' | 'robbery' | 'breakin' | 'employee_theft' | 'unknown';
  deaFormNumber?: string; // DEA-106 form number
  policeReportNumber?: string;
  items: TheftLossItem[];
  totalQuantityLost: number;
  estimatedStreetValue?: number;
  description: string;
  circumstances: string;
  securityMeasures: string;
  reportedToDeaDate?: Date;
  reportedToPoliceDate?: Date;
  reportedBy: string;
  status: 'draft' | 'submitted' | 'under_investigation' | 'closed';
  createdAt: Date;
}

export interface TheftLossItem {
  ndc: string;
  drugName: string;
  deaSchedule: DEASchedule;
  quantityLost: number;
  unit: string;
  strength: string;
  dosageForm: string;
  lotNumber?: string;
  estimatedValue?: number;
}

/**
 * Determine if theft/loss requires DEA reporting
 */
export function requiresDeaReport(items: TheftLossItem[]): boolean {
  // Any Schedule II through V controlled substances require reporting
  const reportableSchedules: DEASchedule[] = ['II', 'III', 'IV', 'V'];
  return items.some(item => reportableSchedules.includes(item.deaSchedule));
}

/**
 * Generate DEA-106 summary (not the actual form, but data for it)
 */
export function generateDea106Summary(report: TheftLossReport): DEA106Summary {
  const scheduleBreakdown: Record<string, number> = {};

  for (const item of report.items) {
    const key = `Schedule ${item.deaSchedule}`;
    scheduleBreakdown[key] = (scheduleBreakdown[key] || 0) + item.quantityLost;
  }

  return {
    pharmacyDeaNumber: report.pharmacyDeaNumber,
    incidentDate: report.discoveryDate,
    reportDate: report.reportDate,
    incidentType: report.incidentType,
    totalItemsAffected: report.items.length,
    totalQuantityLost: report.totalQuantityLost,
    scheduleBreakdown,
    mustReportWithin: '1 business day of discovery',
    submissionMethod: 'Online via DEA Diversion Control Division website',
  };
}

export interface DEA106Summary {
  pharmacyDeaNumber: string;
  incidentDate: Date;
  reportDate: Date;
  incidentType: string;
  totalItemsAffected: number;
  totalQuantityLost: number;
  scheduleBreakdown: Record<string, number>;
  mustReportWithin: string;
  submissionMethod: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const ControlledSubstanceRecordSchema = z.object({
  pharmacyId: z.string().uuid(),
  ndc: z.string(),
  drugName: z.string(),
  deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V', 'LEGEND', 'OTC']),
  transactionType: z.enum([
    'receive',
    'dispense',
    'return_to_stock',
    'reverse_distribution',
    'destruction',
    'theft_loss',
    'adjustment',
    'transfer_out',
    'transfer_in',
  ]),
  quantity: z.number().positive(),
  unit: z.string(),
  lotNumber: z.string().optional(),
  referenceType: z.enum(['prescription', 'order', 'dea222', 'csos', 'destruction', 'theft_report', 'adjustment']).optional(),
  referenceId: z.string().optional(),
  supplierDeaNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  prescriptionNumber: z.string().optional(),
  patientId: z.string().optional(),
  prescriberDeaNumber: z.string().optional(),
  witnessUserId: z.string().optional(),
  destructionMethod: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid(),
  userName: z.string(),
});

export const TheftLossReportSchema = z.object({
  pharmacyId: z.string().uuid(),
  pharmacyDeaNumber: z.string(),
  discoveryDate: z.date(),
  incidentType: z.enum(['theft', 'loss', 'robbery', 'breakin', 'employee_theft', 'unknown']),
  items: z.array(z.object({
    ndc: z.string(),
    drugName: z.string(),
    deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V']),
    quantityLost: z.number().positive(),
    unit: z.string(),
    strength: z.string(),
    dosageForm: z.string(),
  })),
  description: z.string().min(10),
  circumstances: z.string().min(10),
  securityMeasures: z.string(),
  reportedBy: z.string(),
});
