/**
 * Prescription Transfer Module
 *
 * Handles prescription transfers between pharmacies:
 * - Inbound transfers (receiving from another pharmacy)
 * - Outbound transfers (sending to another pharmacy)
 * - Controlled substance transfer restrictions
 * - Transfer documentation and audit trail
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Transfer direction
 */
export type TransferDirection = 'inbound' | 'outbound';

/**
 * Transfer type
 */
export type TransferType = 'full' | 'partial' | 'remaining_refills';

/**
 * Transfer status
 */
export type TransferStatus =
  | 'initiated'
  | 'pending_verification'
  | 'verified'
  | 'completed'
  | 'cancelled'
  | 'rejected';

/**
 * Pharmacy information for transfers
 */
export interface TransferPharmacy {
  name: string;
  npi: string;
  dea: string;
  ncpdpId?: string;
  phone: string;
  fax?: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  };
  pharmacistName: string;
  pharmacistLicense: string;
}

/**
 * Original prescription information
 */
export interface OriginalPrescriptionInfo {
  rxNumber: string;
  drugName: string;
  strength: string;
  quantity: number;
  daysSupply: number;
  sig: string;
  refillsAuthorized: number;
  refillsRemaining: number;
  quantityRemaining?: number;
  writtenDate: Date;
  lastFilledDate?: Date;
  expirationDate: Date;
  deaSchedule?: string;
  prescriberName: string;
  prescriberNpi: string;
  prescriberDea?: string;
  prescriberPhone: string;
}

/**
 * Transfer record
 */
export interface TransferRecord {
  id: string;
  direction: TransferDirection;
  transferType: TransferType;
  prescriptionId?: string; // Our prescription ID (for inbound, created after)

  // Original pharmacy info (for inbound)
  fromPharmacy?: TransferPharmacy;

  // Destination pharmacy info (for outbound)
  toPharmacy?: TransferPharmacy;

  // Prescription details
  originalPrescription: OriginalPrescriptionInfo;
  originalRxNumber: string;
  newRxNumber?: string;
  refillsTransferred: number;
  quantityRemaining?: number;

  // Patient info
  patientFirstName: string;
  patientLastName: string;
  patientDob: Date;
  patientPhone?: string;

  // Controlled substance restrictions
  deaSchedule?: string;
  isControlled: boolean;
  transferAllowed: boolean;
  transferCount: number; // Track for C-II (one-time only)
  previousTransferDate?: Date;

  // Verification
  status: TransferStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationMethod?: 'phone' | 'fax' | 'surescripts';
  verificationNotes?: string;

  // Audit
  initiatedBy: string;
  initiatedAt: Date;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
  auditTrail: TransferAuditEntry[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transfer audit entry
 */
export interface TransferAuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  details?: string;
  previousStatus?: TransferStatus;
  newStatus?: TransferStatus;
}

/**
 * Transfer validation result
 */
export interface TransferValidationResult {
  valid: boolean;
  allowed: boolean;
  errors: string[];
  warnings: string[];
  restrictions?: string[];
}

/**
 * Transfer request for inbound
 */
export interface InboundTransferRequest {
  fromPharmacy: TransferPharmacy;
  originalPrescription: OriginalPrescriptionInfo;
  patientFirstName: string;
  patientLastName: string;
  patientDob: Date;
  patientPhone?: string;
  refillsToTransfer: number;
  initiatedBy: string;
  notes?: string;
}

/**
 * Transfer request for outbound
 */
export interface OutboundTransferRequest {
  prescriptionId: string;
  rxNumber: string;
  toPharmacy: TransferPharmacy;
  refillsToTransfer: number;
  initiatedBy: string;
  notes?: string;
}

/**
 * Transfer summary
 */
export interface TransferSummary {
  totalTransfers: number;
  inbound: number;
  outbound: number;
  byStatus: Record<TransferStatus, number>;
  controlledSubstanceTransfers: number;
  pendingVerification: number;
  completedToday: number;
}

// ============================================
// SCHEMAS
// ============================================

export const TransferPharmacySchema = z.object({
  name: z.string().min(1),
  npi: z.string().length(10),
  dea: z.string().min(9).max(9),
  ncpdpId: z.string().optional(),
  phone: z.string(),
  fax: z.string().optional(),
  address: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
  }),
  pharmacistName: z.string().min(1),
  pharmacistLicense: z.string().min(1),
});

export const OriginalPrescriptionInfoSchema = z.object({
  rxNumber: z.string().min(1),
  drugName: z.string().min(1),
  strength: z.string(),
  quantity: z.number().positive(),
  daysSupply: z.number().positive(),
  sig: z.string().min(1),
  refillsAuthorized: z.number().min(0),
  refillsRemaining: z.number().min(0),
  quantityRemaining: z.number().optional(),
  writtenDate: z.date(),
  lastFilledDate: z.date().optional(),
  expirationDate: z.date(),
  deaSchedule: z.string().optional(),
  prescriberName: z.string().min(1),
  prescriberNpi: z.string().length(10),
  prescriberDea: z.string().optional(),
  prescriberPhone: z.string(),
});

export const TransferRecordSchema = z.object({
  id: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  transferType: z.enum(['full', 'partial', 'remaining_refills']),
  prescriptionId: z.string().optional(),
  fromPharmacy: TransferPharmacySchema.optional(),
  toPharmacy: TransferPharmacySchema.optional(),
  originalPrescription: OriginalPrescriptionInfoSchema,
  originalRxNumber: z.string(),
  newRxNumber: z.string().optional(),
  refillsTransferred: z.number().min(0),
  quantityRemaining: z.number().optional(),
  patientFirstName: z.string(),
  patientLastName: z.string(),
  patientDob: z.date(),
  patientPhone: z.string().optional(),
  deaSchedule: z.string().optional(),
  isControlled: z.boolean(),
  transferAllowed: z.boolean(),
  transferCount: z.number().min(0),
  previousTransferDate: z.date().optional(),
  status: z.enum([
    'initiated',
    'pending_verification',
    'verified',
    'completed',
    'cancelled',
    'rejected',
  ]),
  verifiedBy: z.string().optional(),
  verifiedAt: z.date().optional(),
  verificationMethod: z.enum(['phone', 'fax', 'surescripts']).optional(),
  verificationNotes: z.string().optional(),
  initiatedBy: z.string(),
  initiatedAt: z.date(),
  completedBy: z.string().optional(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * DEA schedules that cannot be transferred (vary by state)
 */
export const NON_TRANSFERABLE_SCHEDULES_STRICT = ['II'];

/**
 * DEA schedules with one-time transfer limit
 */
export const ONE_TIME_TRANSFER_SCHEDULES = ['II'];

/**
 * DEA schedules with limited transfers (typically 1 transfer allowed)
 */
export const LIMITED_TRANSFER_SCHEDULES = ['III', 'IV', 'V'];

/**
 * Maximum transfer count for controlled substances
 * Federal law: C-II cannot be transferred
 * C-III through C-V can be transferred once
 */
export const MAX_TRANSFER_COUNT: Record<string, number> = {
  II: 0, // Cannot transfer
  III: 1,
  IV: 1,
  V: 1,
};

/**
 * Transfer status display names
 */
export const TRANSFER_STATUS_NAMES: Record<TransferStatus, string> = {
  initiated: 'Initiated',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate a unique transfer ID
 */
export function generateTransferId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TRF-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if a controlled substance can be transferred
 */
export function canTransferControlledSubstance(
  deaSchedule: string,
  previousTransferCount: number,
  stateAllowsC2Transfer: boolean = false
): TransferValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const restrictions: string[] = [];

  const schedule = deaSchedule.toUpperCase().replace(/[^IVX]/g, '');

  // C-II cannot be transferred (federal law)
  if (schedule === 'II') {
    if (!stateAllowsC2Transfer) {
      errors.push('Schedule II controlled substances cannot be transferred');
      return {
        valid: false,
        allowed: false,
        errors,
        warnings,
        restrictions: ['Federal law prohibits C-II transfers'],
      };
    } else {
      warnings.push(
        'Schedule II transfer allowed by state law - verify state regulations'
      );
      restrictions.push('State-specific C-II transfer rules apply');
    }
  }

  // C-III through C-V can only be transferred once
  if (LIMITED_TRANSFER_SCHEDULES.includes(schedule)) {
    const maxTransfers = MAX_TRANSFER_COUNT[schedule] || 1;

    if (previousTransferCount >= maxTransfers) {
      errors.push(
        `Schedule ${schedule} prescription has already been transferred the maximum allowed times (${maxTransfers})`
      );
      return {
        valid: false,
        allowed: false,
        errors,
        warnings,
        restrictions: [`Maximum ${maxTransfers} transfer(s) allowed`],
      };
    }

    restrictions.push(
      `Schedule ${schedule}: ${maxTransfers - previousTransferCount} transfer(s) remaining`
    );
  }

  return {
    valid: true,
    allowed: true,
    errors,
    warnings,
    restrictions,
  };
}

/**
 * Validate transfer request
 */
export function validateTransferRequest(
  originalPrescription: OriginalPrescriptionInfo,
  refillsToTransfer: number,
  previousTransferCount: number = 0,
  stateAllowsC2Transfer: boolean = false
): TransferValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const restrictions: string[] = [];

  // Check refills available
  if (refillsToTransfer > originalPrescription.refillsRemaining) {
    errors.push(
      `Cannot transfer ${refillsToTransfer} refills - only ${originalPrescription.refillsRemaining} remaining`
    );
  }

  // Check expiration
  if (originalPrescription.expirationDate < new Date()) {
    errors.push('Prescription has expired and cannot be transferred');
  }

  // Check controlled substance restrictions
  if (originalPrescription.deaSchedule) {
    const csValidation = canTransferControlledSubstance(
      originalPrescription.deaSchedule,
      previousTransferCount,
      stateAllowsC2Transfer
    );

    if (!csValidation.allowed) {
      errors.push(...csValidation.errors);
    }
    warnings.push(...csValidation.warnings);
    if (csValidation.restrictions) {
      restrictions.push(...csValidation.restrictions);
    }
  }

  // Check if partial transfer makes sense
  if (
    refillsToTransfer < originalPrescription.refillsRemaining &&
    originalPrescription.deaSchedule
  ) {
    warnings.push(
      'Partial transfer of controlled substance - remaining refills cannot be transferred later'
    );
  }

  return {
    valid: errors.length === 0,
    allowed: errors.length === 0,
    errors,
    warnings,
    restrictions,
  };
}

/**
 * Create an inbound transfer record
 */
export function createInboundTransfer(
  request: InboundTransferRequest
): TransferRecord {
  const now = new Date();
  const isControlled = !!request.originalPrescription.deaSchedule;

  // Determine transfer type
  let transferType: TransferType = 'full';
  if (
    request.refillsToTransfer < request.originalPrescription.refillsRemaining
  ) {
    transferType = 'partial';
  } else if (request.originalPrescription.quantityRemaining) {
    transferType = 'remaining_refills';
  }

  const record: TransferRecord = {
    id: generateTransferId(),
    direction: 'inbound',
    transferType,
    fromPharmacy: request.fromPharmacy,
    originalPrescription: request.originalPrescription,
    originalRxNumber: request.originalPrescription.rxNumber,
    refillsTransferred: request.refillsToTransfer,
    quantityRemaining: request.originalPrescription.quantityRemaining,
    patientFirstName: request.patientFirstName,
    patientLastName: request.patientLastName,
    patientDob: request.patientDob,
    patientPhone: request.patientPhone,
    deaSchedule: request.originalPrescription.deaSchedule,
    isControlled,
    transferAllowed: true, // Will be validated
    transferCount: 1, // This transfer
    status: 'initiated',
    initiatedBy: request.initiatedBy,
    initiatedAt: now,
    notes: request.notes,
    auditTrail: [
      {
        timestamp: now,
        action: 'initiated',
        userId: request.initiatedBy,
        details: `Inbound transfer initiated from ${request.fromPharmacy.name}`,
        newStatus: 'initiated',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return record;
}

/**
 * Create an outbound transfer record
 */
export function createOutboundTransfer(
  request: OutboundTransferRequest,
  originalPrescription: OriginalPrescriptionInfo,
  patientInfo: { firstName: string; lastName: string; dob: Date; phone?: string }
): TransferRecord {
  const now = new Date();
  const isControlled = !!originalPrescription.deaSchedule;

  // Determine transfer type
  let transferType: TransferType = 'full';
  if (request.refillsToTransfer < originalPrescription.refillsRemaining) {
    transferType = 'partial';
  }

  const record: TransferRecord = {
    id: generateTransferId(),
    direction: 'outbound',
    transferType,
    prescriptionId: request.prescriptionId,
    toPharmacy: request.toPharmacy,
    originalPrescription,
    originalRxNumber: request.rxNumber,
    refillsTransferred: request.refillsToTransfer,
    patientFirstName: patientInfo.firstName,
    patientLastName: patientInfo.lastName,
    patientDob: patientInfo.dob,
    patientPhone: patientInfo.phone,
    deaSchedule: originalPrescription.deaSchedule,
    isControlled,
    transferAllowed: true,
    transferCount: 1,
    status: 'initiated',
    initiatedBy: request.initiatedBy,
    initiatedAt: now,
    notes: request.notes,
    auditTrail: [
      {
        timestamp: now,
        action: 'initiated',
        userId: request.initiatedBy,
        details: `Outbound transfer initiated to ${request.toPharmacy.name}`,
        newStatus: 'initiated',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return record;
}

/**
 * Update transfer status
 */
export function updateTransferStatus(
  record: TransferRecord,
  newStatus: TransferStatus,
  userId: string,
  notes?: string
): TransferRecord {
  const now = new Date();
  const previousStatus = record.status;

  return {
    ...record,
    status: newStatus,
    updatedAt: now,
    auditTrail: [
      ...record.auditTrail,
      {
        timestamp: now,
        action: 'status_change',
        userId,
        details: notes,
        previousStatus,
        newStatus,
      },
    ],
  };
}

/**
 * Verify transfer
 */
export function verifyTransfer(
  record: TransferRecord,
  verifiedBy: string,
  method: 'phone' | 'fax' | 'surescripts',
  notes?: string
): TransferRecord {
  const now = new Date();

  return {
    ...updateTransferStatus(record, 'verified', verifiedBy, notes),
    verifiedBy,
    verifiedAt: now,
    verificationMethod: method,
    verificationNotes: notes,
  };
}

/**
 * Complete transfer
 */
export function completeTransfer(
  record: TransferRecord,
  completedBy: string,
  newRxNumber?: string,
  prescriptionId?: string
): TransferRecord {
  const now = new Date();

  return {
    ...updateTransferStatus(
      record,
      'completed',
      completedBy,
      `Transfer completed. New Rx#: ${newRxNumber || 'N/A'}`
    ),
    newRxNumber,
    prescriptionId,
    completedBy,
    completedAt: now,
  };
}

/**
 * Cancel transfer
 */
export function cancelTransfer(
  record: TransferRecord,
  cancelledBy: string,
  reason: string
): TransferRecord {
  return updateTransferStatus(record, 'cancelled', cancelledBy, reason);
}

/**
 * Reject transfer
 */
export function rejectTransfer(
  record: TransferRecord,
  rejectedBy: string,
  reason: string
): TransferRecord {
  return {
    ...updateTransferStatus(record, 'rejected', rejectedBy, reason),
    transferAllowed: false,
  };
}

/**
 * Generate transfer documentation text
 */
export function generateTransferDocumentation(
  record: TransferRecord
): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('PRESCRIPTION TRANSFER DOCUMENTATION');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Transfer ID: ${record.id}`);
  lines.push(`Direction: ${record.direction.toUpperCase()}`);
  lines.push(`Date: ${record.initiatedAt.toISOString()}`);
  lines.push('');

  lines.push('PATIENT INFORMATION');
  lines.push('-'.repeat(40));
  lines.push(`Name: ${record.patientFirstName} ${record.patientLastName}`);
  lines.push(`DOB: ${record.patientDob.toLocaleDateString()}`);
  if (record.patientPhone) {
    lines.push(`Phone: ${record.patientPhone}`);
  }
  lines.push('');

  lines.push('PRESCRIPTION INFORMATION');
  lines.push('-'.repeat(40));
  lines.push(`Original Rx#: ${record.originalRxNumber}`);
  if (record.newRxNumber) {
    lines.push(`New Rx#: ${record.newRxNumber}`);
  }
  lines.push(`Drug: ${record.originalPrescription.drugName} ${record.originalPrescription.strength}`);
  lines.push(`Quantity: ${record.originalPrescription.quantity}`);
  lines.push(`Days Supply: ${record.originalPrescription.daysSupply}`);
  lines.push(`Sig: ${record.originalPrescription.sig}`);
  lines.push(`Refills Authorized: ${record.originalPrescription.refillsAuthorized}`);
  lines.push(`Refills Transferred: ${record.refillsTransferred}`);
  lines.push(`Written Date: ${record.originalPrescription.writtenDate.toLocaleDateString()}`);
  lines.push(`Expiration Date: ${record.originalPrescription.expirationDate.toLocaleDateString()}`);

  if (record.isControlled) {
    lines.push('');
    lines.push('CONTROLLED SUBSTANCE');
    lines.push('-'.repeat(40));
    lines.push(`DEA Schedule: ${record.deaSchedule}`);
    lines.push(`Transfer Count: ${record.transferCount}`);
  }
  lines.push('');

  lines.push('PRESCRIBER INFORMATION');
  lines.push('-'.repeat(40));
  lines.push(`Name: ${record.originalPrescription.prescriberName}`);
  lines.push(`NPI: ${record.originalPrescription.prescriberNpi}`);
  if (record.originalPrescription.prescriberDea) {
    lines.push(`DEA: ${record.originalPrescription.prescriberDea}`);
  }
  lines.push(`Phone: ${record.originalPrescription.prescriberPhone}`);
  lines.push('');

  if (record.fromPharmacy) {
    lines.push('TRANSFERRING PHARMACY');
    lines.push('-'.repeat(40));
    lines.push(`Name: ${record.fromPharmacy.name}`);
    lines.push(`NPI: ${record.fromPharmacy.npi}`);
    lines.push(`DEA: ${record.fromPharmacy.dea}`);
    lines.push(`Phone: ${record.fromPharmacy.phone}`);
    lines.push(`Pharmacist: ${record.fromPharmacy.pharmacistName} (${record.fromPharmacy.pharmacistLicense})`);
    lines.push('');
  }

  if (record.toPharmacy) {
    lines.push('RECEIVING PHARMACY');
    lines.push('-'.repeat(40));
    lines.push(`Name: ${record.toPharmacy.name}`);
    lines.push(`NPI: ${record.toPharmacy.npi}`);
    lines.push(`DEA: ${record.toPharmacy.dea}`);
    lines.push(`Phone: ${record.toPharmacy.phone}`);
    lines.push(`Pharmacist: ${record.toPharmacy.pharmacistName} (${record.toPharmacy.pharmacistLicense})`);
    lines.push('');
  }

  lines.push('VERIFICATION');
  lines.push('-'.repeat(40));
  lines.push(`Status: ${TRANSFER_STATUS_NAMES[record.status]}`);
  if (record.verifiedBy) {
    lines.push(`Verified By: ${record.verifiedBy}`);
    lines.push(`Verified At: ${record.verifiedAt?.toISOString()}`);
    lines.push(`Method: ${record.verificationMethod}`);
  }
  if (record.completedBy) {
    lines.push(`Completed By: ${record.completedBy}`);
    lines.push(`Completed At: ${record.completedAt?.toISOString()}`);
  }
  lines.push('');

  if (record.notes) {
    lines.push('NOTES');
    lines.push('-'.repeat(40));
    lines.push(record.notes);
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Calculate transfer summary statistics
 */
export function calculateTransferSummary(
  records: TransferRecord[]
): TransferSummary {
  const byStatus: Record<TransferStatus, number> = {
    initiated: 0,
    pending_verification: 0,
    verified: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };

  let inbound = 0;
  let outbound = 0;
  let controlledSubstanceTransfers = 0;
  let pendingVerification = 0;
  let completedToday = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const record of records) {
    byStatus[record.status]++;

    if (record.direction === 'inbound') {
      inbound++;
    } else {
      outbound++;
    }

    if (record.isControlled) {
      controlledSubstanceTransfers++;
    }

    if (
      record.status === 'initiated' ||
      record.status === 'pending_verification'
    ) {
      pendingVerification++;
    }

    if (record.completedAt && record.completedAt >= today) {
      completedToday++;
    }
  }

  return {
    totalTransfers: records.length,
    inbound,
    outbound,
    byStatus,
    controlledSubstanceTransfers,
    pendingVerification,
    completedToday,
  };
}

/**
 * Filter transfer records
 */
export function filterTransferRecords(
  records: TransferRecord[],
  filters: {
    direction?: TransferDirection;
    status?: TransferStatus;
    isControlled?: boolean;
    startDate?: Date;
    endDate?: Date;
    pharmacyNpi?: string;
  }
): TransferRecord[] {
  return records.filter((record) => {
    if (filters.direction && record.direction !== filters.direction) {
      return false;
    }
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    if (
      filters.isControlled !== undefined &&
      record.isControlled !== filters.isControlled
    ) {
      return false;
    }
    if (filters.startDate && record.initiatedAt < filters.startDate) {
      return false;
    }
    if (filters.endDate && record.initiatedAt > filters.endDate) {
      return false;
    }
    if (filters.pharmacyNpi) {
      const matchesFrom = record.fromPharmacy?.npi === filters.pharmacyNpi;
      const matchesTo = record.toPharmacy?.npi === filters.pharmacyNpi;
      if (!matchesFrom && !matchesTo) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sort transfer records by date
 */
export function sortTransferRecordsByDate(
  records: TransferRecord[],
  order: 'asc' | 'desc' = 'desc'
): TransferRecord[] {
  return [...records].sort((a, b) => {
    const diff = a.initiatedAt.getTime() - b.initiatedAt.getTime();
    return order === 'asc' ? diff : -diff;
  });
}

/**
 * Get pending transfers requiring action
 */
export function getPendingTransfers(
  records: TransferRecord[]
): TransferRecord[] {
  return records.filter(
    (r) => r.status === 'initiated' || r.status === 'pending_verification'
  );
}

/**
 * Check if transfer is within valid time window
 * Most states require transfers to be completed within 72 hours
 */
export function isTransferWithinTimeWindow(
  record: TransferRecord,
  maxHours: number = 72
): boolean {
  const elapsed = Date.now() - record.initiatedAt.getTime();
  const maxMs = maxHours * 60 * 60 * 1000;
  return elapsed <= maxMs;
}

/**
 * Get time remaining for transfer completion
 */
export function getTransferTimeRemaining(
  record: TransferRecord,
  maxHours: number = 72
): { hoursRemaining: number; isOverdue: boolean } {
  const elapsed = Date.now() - record.initiatedAt.getTime();
  const maxMs = maxHours * 60 * 60 * 1000;
  const remaining = maxMs - elapsed;

  return {
    hoursRemaining: Math.max(0, Math.floor(remaining / (60 * 60 * 1000))),
    isOverdue: remaining < 0,
  };
}
