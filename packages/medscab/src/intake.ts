/**
 * Prescription Intake Module
 *
 * Handles multi-channel prescription intake:
 * - Electronic (Surescripts e-Rx)
 * - Fax with OCR
 * - Hard copy (scanned physical Rx)
 * - Phone (verbal prescription)
 * - Transfer-in from another pharmacy
 * - Refill request (patient-initiated)
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Intake channel types
 */
export type IntakeChannel =
  | 'electronic' // Surescripts e-Rx
  | 'fax' // eFax with OCR
  | 'hard_copy' // Scanned physical Rx
  | 'phone' // Verbal prescription
  | 'transfer_in' // From another pharmacy
  | 'refill_request'; // Patient-initiated

/**
 * Intake status
 */
export type IntakeStatus =
  | 'pending'
  | 'ai_processing'
  | 'needs_review'
  | 'processed'
  | 'rejected';

/**
 * E-Script message types (NCPDP SCRIPT Standard)
 */
export type EScriptMessageType =
  | 'NewRx'
  | 'RxRenewal'
  | 'RxChange'
  | 'CancelRx'
  | 'RxFill'
  | 'RxTransfer';

/**
 * NCPDP SCRIPT version
 */
export type ScriptVersion = 'v2017071' | 'v2023011';

/**
 * Prescriber verification method
 */
export type PrescriberVerificationMethod =
  | 'surescripts'
  | 'manual'
  | 'dea_lookup'
  | 'npi_registry';

/**
 * Patient identification from intake
 */
export interface PatientIdentification {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  dateOfBirth: Date;
  gender?: 'M' | 'F' | 'U';
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  email?: string;
  ssn?: string; // Last 4 only for matching
}

/**
 * Medication details from intake
 */
export interface MedicationDetails {
  drugName: string;
  ndc?: string;
  rxcui?: string;
  strength: string;
  strengthUnit?: string;
  dosageForm: string;
  quantity: number;
  quantityUnit?: string;
  daysSupply: number;
  sig: string; // Directions
  refillsAuthorized: number;
  substitutionAllowed: boolean;
  dawCode?: string;
  diagnosis?: string;
  icd10Code?: string;
  deaSchedule?: string;
  writtenDate: Date;
  effectiveDate?: Date;
  expirationDate?: Date;
  priorAuthNumber?: string;
}

/**
 * EPCS signature for controlled substances
 */
export interface EPCSSignature {
  signatureType: 'two_factor' | 'biometric' | 'token';
  signatureData: string;
  signatureTimestamp: Date;
  certificateSerialNumber: string;
  certificateIssuer: string;
  signatureValid: boolean;
  verifiedAt?: Date;
}

/**
 * Prescriber information
 */
export interface PrescriberInfo {
  npi: string;
  dea?: string;
  stateLicense?: string;
  firstName: string;
  lastName: string;
  suffix?: string;
  credential?: string;
  specialty?: string;
  phone: string;
  fax?: string;
  email?: string;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  };
  supervisingPhysician?: {
    npi: string;
    name: string;
  };
}

/**
 * Prescriber verification result
 */
export interface PrescriberVerification {
  prescriberId: string;
  npi: string;
  deaNumber?: string;
  npiValid: boolean;
  npiStatus?: 'active' | 'inactive' | 'deactivated';
  deaValid: boolean;
  deaStatus?: 'active' | 'expired' | 'revoked' | 'suspended';
  deaExpiration?: Date;
  deaSchedules?: string[]; // Which schedules they can prescribe
  licenseValid: boolean;
  licenseState?: string;
  licenseExpiration?: Date;
  exclusionCheck: boolean; // OIG, SAM, OFAC check passed
  exclusionSources?: string[];
  verificationMethod: PrescriberVerificationMethod;
  verifiedAt: Date;
  verifiedBy?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * E-Script message from Surescripts
 */
export interface EScriptMessage {
  messageId: string;
  messageType: EScriptMessageType;
  scriptVersion: ScriptVersion;
  relatesTo?: string; // Original message ID for responses
  prescriber: PrescriberInfo;
  patient: PatientIdentification;
  medication: MedicationDetails;
  pharmacy?: {
    ncpdpId: string;
    npi: string;
    name: string;
    phone: string;
  };
  epcsSignature?: EPCSSignature; // For controlled substances
  supervisorInfo?: {
    npi: string;
    dea?: string;
    name: string;
  };
  notes?: string;
  receivedAt: Date;
  rawXml?: string;
}

/**
 * Intake record
 */
export interface IntakeRecord {
  id: string;
  channel: IntakeChannel;
  receivedAt: Date;
  sourceIdentifier?: string; // Fax number, e-Rx message ID, etc.
  rawData?: string; // Original data/image
  imageUrl?: string; // For fax/scan
  ocrConfidence?: number; // 0-100 for fax/scan
  aiInterpretationId?: string;
  escriptMessage?: EScriptMessage;
  patientIdentification?: PatientIdentification;
  medicationDetails?: MedicationDetails;
  prescriberInfo?: PrescriberInfo;
  prescriberVerified: boolean;
  prescriberVerification?: PrescriberVerification;
  prescriberVerificationMethod?: PrescriberVerificationMethod;
  status: IntakeStatus;
  statusReason?: string;
  processedBy?: string;
  processedAt?: Date;
  prescriptionId?: string; // Link to created prescription
  notes?: string;
  auditTrail: IntakeAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Intake audit entry
 */
export interface IntakeAuditEntry {
  timestamp: Date;
  action: string;
  userId?: string;
  details?: string;
  previousStatus?: IntakeStatus;
  newStatus?: IntakeStatus;
}

/**
 * Intake processing result
 */
export interface IntakeProcessingResult {
  success: boolean;
  intakeRecord: IntakeRecord;
  prescriptionId?: string;
  errors?: string[];
  warnings?: string[];
  requiresReview: boolean;
  reviewReasons?: string[];
}

/**
 * Fax intake options
 */
export interface FaxIntakeOptions {
  faxNumber: string;
  receivedAt: Date;
  imageData: string; // Base64 encoded
  pageCount: number;
  performOcr: boolean;
  ocrProvider?: 'documo' | 'google_vision' | 'aws_textract';
}

/**
 * Phone intake options
 */
export interface PhoneIntakeOptions {
  callerPhone: string;
  callDuration?: number;
  recordingUrl?: string;
  verbalAuthorization: boolean;
  callbackRequired: boolean;
  receivedBy: string;
}

// ============================================
// SCHEMAS
// ============================================

export const PatientIdentificationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  dateOfBirth: z.date(),
  gender: z.enum(['M', 'F', 'U']).optional(),
  address: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string().length(2),
      zip: z.string(),
    })
    .optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  ssn: z.string().max(4).optional(),
});

export const MedicationDetailsSchema = z.object({
  drugName: z.string().min(1),
  ndc: z.string().optional(),
  rxcui: z.string().optional(),
  strength: z.string(),
  strengthUnit: z.string().optional(),
  dosageForm: z.string(),
  quantity: z.number().positive(),
  quantityUnit: z.string().optional(),
  daysSupply: z.number().positive(),
  sig: z.string().min(1),
  refillsAuthorized: z.number().min(0).max(99),
  substitutionAllowed: z.boolean(),
  dawCode: z.string().optional(),
  diagnosis: z.string().optional(),
  icd10Code: z.string().optional(),
  deaSchedule: z.string().optional(),
  writtenDate: z.date(),
  effectiveDate: z.date().optional(),
  expirationDate: z.date().optional(),
  priorAuthNumber: z.string().optional(),
});

export const PrescriberInfoSchema = z.object({
  npi: z.string().length(10),
  dea: z.string().optional(),
  stateLicense: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  suffix: z.string().optional(),
  credential: z.string().optional(),
  specialty: z.string().optional(),
  phone: z.string(),
  fax: z.string().optional(),
  email: z.string().email().optional(),
  address: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string().length(2),
      zip: z.string(),
    })
    .optional(),
  supervisingPhysician: z
    .object({
      npi: z.string().length(10),
      name: z.string(),
    })
    .optional(),
});

export const IntakeRecordSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum([
    'electronic',
    'fax',
    'hard_copy',
    'phone',
    'transfer_in',
    'refill_request',
  ]),
  receivedAt: z.date(),
  sourceIdentifier: z.string().optional(),
  rawData: z.string().optional(),
  imageUrl: z.string().url().optional(),
  ocrConfidence: z.number().min(0).max(100).optional(),
  aiInterpretationId: z.string().optional(),
  prescriberVerified: z.boolean(),
  prescriberVerificationMethod: z
    .enum(['surescripts', 'manual', 'dea_lookup', 'npi_registry'])
    .optional(),
  status: z.enum([
    'pending',
    'ai_processing',
    'needs_review',
    'processed',
    'rejected',
  ]),
  statusReason: z.string().optional(),
  processedBy: z.string().optional(),
  processedAt: z.date().optional(),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Intake channel display names
 */
export const INTAKE_CHANNEL_NAMES: Record<IntakeChannel, string> = {
  electronic: 'Electronic Prescription (e-Rx)',
  fax: 'Fax',
  hard_copy: 'Hard Copy',
  phone: 'Phone (Verbal)',
  transfer_in: 'Transfer In',
  refill_request: 'Refill Request',
};

/**
 * E-Script message type display names
 */
export const ESCRIPT_MESSAGE_TYPE_NAMES: Record<EScriptMessageType, string> = {
  NewRx: 'New Prescription',
  RxRenewal: 'Renewal Request',
  RxChange: 'Change Request',
  CancelRx: 'Cancellation',
  RxFill: 'Fill Status',
  RxTransfer: 'Transfer',
};

/**
 * Minimum OCR confidence threshold for auto-processing
 */
export const MIN_OCR_CONFIDENCE = 85;

/**
 * Controlled substance schedules requiring EPCS
 */
export const EPCS_REQUIRED_SCHEDULES = ['II', 'III', 'IV', 'V'];

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate a unique intake record ID
 */
export function generateIntakeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `INT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create a new intake record
 */
export function createIntakeRecord(
  channel: IntakeChannel,
  options?: Partial<IntakeRecord>
): IntakeRecord {
  const now = new Date();
  return {
    id: generateIntakeId(),
    channel,
    receivedAt: now,
    prescriberVerified: false,
    status: 'pending',
    auditTrail: [
      {
        timestamp: now,
        action: 'created',
        details: `Intake record created via ${INTAKE_CHANNEL_NAMES[channel]}`,
        newStatus: 'pending',
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

/**
 * Create intake record from e-script message
 */
export function createIntakeFromEScript(message: EScriptMessage): IntakeRecord {
  return createIntakeRecord('electronic', {
    sourceIdentifier: message.messageId,
    receivedAt: message.receivedAt,
    escriptMessage: message,
    patientIdentification: message.patient,
    medicationDetails: message.medication,
    prescriberInfo: message.prescriber,
    rawData: message.rawXml,
  });
}

/**
 * Create intake record from fax
 */
export function createIntakeFromFax(options: FaxIntakeOptions): IntakeRecord {
  return createIntakeRecord('fax', {
    sourceIdentifier: options.faxNumber,
    receivedAt: options.receivedAt,
    rawData: options.imageData,
    status: options.performOcr ? 'ai_processing' : 'pending',
  });
}

/**
 * Create intake record from phone call
 */
export function createIntakeFromPhone(
  options: PhoneIntakeOptions
): IntakeRecord {
  return createIntakeRecord('phone', {
    sourceIdentifier: options.callerPhone,
    notes: options.verbalAuthorization
      ? 'Verbal authorization received'
      : 'Callback required for verification',
  });
}

/**
 * Update intake record status
 */
export function updateIntakeStatus(
  record: IntakeRecord,
  newStatus: IntakeStatus,
  userId?: string,
  reason?: string
): IntakeRecord {
  const now = new Date();
  const previousStatus = record.status;

  return {
    ...record,
    status: newStatus,
    statusReason: reason,
    updatedAt: now,
    auditTrail: [
      ...record.auditTrail,
      {
        timestamp: now,
        action: 'status_change',
        userId,
        details: reason,
        previousStatus,
        newStatus,
      },
    ],
  };
}

/**
 * Mark intake as processed
 */
export function markIntakeProcessed(
  record: IntakeRecord,
  prescriptionId: string,
  userId: string
): IntakeRecord {
  const now = new Date();
  return {
    ...record,
    status: 'processed',
    prescriptionId,
    processedBy: userId,
    processedAt: now,
    updatedAt: now,
    auditTrail: [
      ...record.auditTrail,
      {
        timestamp: now,
        action: 'processed',
        userId,
        details: `Prescription ${prescriptionId} created`,
        previousStatus: record.status,
        newStatus: 'processed',
      },
    ],
  };
}

/**
 * Mark intake as rejected
 */
export function markIntakeRejected(
  record: IntakeRecord,
  reason: string,
  userId: string
): IntakeRecord {
  const now = new Date();
  return {
    ...record,
    status: 'rejected',
    statusReason: reason,
    processedBy: userId,
    processedAt: now,
    updatedAt: now,
    auditTrail: [
      ...record.auditTrail,
      {
        timestamp: now,
        action: 'rejected',
        userId,
        details: reason,
        previousStatus: record.status,
        newStatus: 'rejected',
      },
    ],
  };
}

/**
 * Validate NPI number using Luhn algorithm
 */
export function isValidNPI(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) {
    return false;
  }

  // NPI uses modified Luhn algorithm with prefix 80840
  const prefixedNpi = '80840' + npi;
  let sum = 0;
  let alternate = false;

  for (let i = prefixedNpi.length - 1; i >= 0; i--) {
    const charAtI = prefixedNpi.charAt(i);
    let digit = charAtI ? parseInt(charAtI, 10) : 0;

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Validate DEA number format and checksum
 * Format: 2 letters + 6 digits + 1 check digit
 * First letter: registrant type (A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, X)
 * Second letter: first letter of registrant's last name (or 9 for special cases)
 */
export function isValidDEANumber(dea: string): boolean {
  if (!/^[A-Z]{2}\d{7}$/.test(dea.toUpperCase())) {
    return false;
  }

  const deaUpper = dea.toUpperCase();
  const validPrefixes = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    'M',
    'P',
    'R',
    'S',
    'T',
    'U',
    'X',
  ];

  const firstChar = deaUpper.charAt(0);
  if (!firstChar || !validPrefixes.includes(firstChar)) {
    return false;
  }

  // Calculate checksum
  const digits = deaUpper.substring(2);
  const d0 = parseInt(digits.charAt(0)) || 0;
  const d1 = parseInt(digits.charAt(1)) || 0;
  const d2 = parseInt(digits.charAt(2)) || 0;
  const d3 = parseInt(digits.charAt(3)) || 0;
  const d4 = parseInt(digits.charAt(4)) || 0;
  const d5 = parseInt(digits.charAt(5)) || 0;
  const d6 = parseInt(digits.charAt(6)) || 0;

  const odd = d0 + d2 + d4;
  const even = (d1 + d3 + d5) * 2;
  const checksum = (odd + even) % 10;

  return checksum === d6;
}

/**
 * Check if prescriber can prescribe controlled substances
 */
export function canPrescribeControlled(
  verification: PrescriberVerification,
  schedule: string
): boolean {
  if (!verification.deaValid) {
    return false;
  }

  if (!verification.deaSchedules || verification.deaSchedules.length === 0) {
    return false;
  }

  // Check if DEA covers the requested schedule
  const scheduleLevel = schedule.replace(/[^IVX]/gi, '').toUpperCase();
  return verification.deaSchedules.some(
    (s) => s.toUpperCase() === scheduleLevel
  );
}

/**
 * Verify prescriber credentials (basic validation)
 */
export function verifyPrescriber(
  prescriber: PrescriberInfo,
  method: PrescriberVerificationMethod = 'manual'
): PrescriberVerification {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate NPI
  const npiValid = isValidNPI(prescriber.npi);
  if (!npiValid) {
    errors.push('Invalid NPI number');
  }

  // Validate DEA if provided
  let deaValid = false;
  if (prescriber.dea) {
    deaValid = isValidDEANumber(prescriber.dea);
    if (!deaValid) {
      errors.push('Invalid DEA number format');
    }
  } else {
    warnings.push('No DEA number provided - cannot prescribe controlled substances');
  }

  return {
    prescriberId: prescriber.npi,
    npi: prescriber.npi,
    deaNumber: prescriber.dea,
    npiValid,
    npiStatus: npiValid ? 'active' : undefined,
    deaValid,
    deaStatus: deaValid ? 'active' : undefined,
    deaSchedules: deaValid ? ['II', 'III', 'IV', 'V'] : undefined, // Would come from lookup
    licenseValid: !!prescriber.stateLicense,
    licenseState: prescriber.address?.state,
    exclusionCheck: true, // Would need external lookup
    verificationMethod: method,
    verifiedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate EPCS signature for controlled substances
 */
export function validateEPCSSignature(signature: EPCSSignature): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!signature.signatureValid) {
    errors.push('EPCS signature is marked as invalid');
  }

  if (!signature.signatureData) {
    errors.push('Missing signature data');
  }

  if (!signature.certificateSerialNumber) {
    errors.push('Missing certificate serial number');
  }

  // Check signature age (should be recent)
  const signatureAge = Date.now() - signature.signatureTimestamp.getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (signatureAge > maxAge) {
    errors.push('EPCS signature is too old');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if intake requires manual review
 */
export function requiresManualReview(record: IntakeRecord): {
  required: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Low OCR confidence
  if (
    record.ocrConfidence !== undefined &&
    record.ocrConfidence < MIN_OCR_CONFIDENCE
  ) {
    reasons.push(`OCR confidence ${record.ocrConfidence}% below threshold`);
  }

  // Prescriber not verified
  if (!record.prescriberVerified) {
    reasons.push('Prescriber credentials not verified');
  }

  // Controlled substance without EPCS
  if (
    record.medicationDetails?.deaSchedule &&
    EPCS_REQUIRED_SCHEDULES.includes(record.medicationDetails.deaSchedule) &&
    !record.escriptMessage?.epcsSignature
  ) {
    reasons.push('Controlled substance requires EPCS verification');
  }

  // Phone/verbal orders need verification
  if (record.channel === 'phone') {
    reasons.push('Phone orders require pharmacist verification');
  }

  // Missing required fields
  if (!record.patientIdentification?.firstName) {
    reasons.push('Missing patient first name');
  }
  if (!record.patientIdentification?.lastName) {
    reasons.push('Missing patient last name');
  }
  if (!record.patientIdentification?.dateOfBirth) {
    reasons.push('Missing patient date of birth');
  }
  if (!record.medicationDetails?.drugName) {
    reasons.push('Missing drug name');
  }
  if (!record.medicationDetails?.quantity) {
    reasons.push('Missing quantity');
  }
  if (!record.medicationDetails?.sig) {
    reasons.push('Missing directions (SIG)');
  }

  return {
    required: reasons.length > 0,
    reasons,
  };
}

/**
 * Process intake record
 */
export function processIntakeRecord(
  record: IntakeRecord,
  userId: string
): IntakeProcessingResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if already processed
  if (record.status === 'processed') {
    return {
      success: false,
      intakeRecord: record,
      errors: ['Intake record already processed'],
      warnings: [],
      requiresReview: false,
    };
  }

  // Check if rejected
  if (record.status === 'rejected') {
    return {
      success: false,
      intakeRecord: record,
      errors: ['Cannot process rejected intake record'],
      warnings: [],
      requiresReview: false,
    };
  }

  // Check for manual review requirements
  const reviewCheck = requiresManualReview(record);
  if (reviewCheck.required) {
    const updatedRecord = updateIntakeStatus(
      record,
      'needs_review',
      userId,
      'Manual review required'
    );
    return {
      success: false,
      intakeRecord: updatedRecord,
      errors: [],
      warnings: reviewCheck.reasons,
      requiresReview: true,
      reviewReasons: reviewCheck.reasons,
    };
  }

  // Validate prescriber
  if (record.prescriberInfo && !record.prescriberVerified) {
    const verification = verifyPrescriber(record.prescriberInfo);
    if (verification.errors && verification.errors.length > 0) {
      errors.push(...verification.errors);
    }
    if (verification.warnings && verification.warnings.length > 0) {
      warnings.push(...verification.warnings);
    }
  }

  // Validate EPCS for controlled substances
  if (
    record.escriptMessage?.epcsSignature &&
    record.medicationDetails?.deaSchedule
  ) {
    const epcsValidation = validateEPCSSignature(
      record.escriptMessage.epcsSignature
    );
    if (!epcsValidation.valid) {
      errors.push(...epcsValidation.errors);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      intakeRecord: record,
      errors,
      warnings,
      requiresReview: true,
      reviewReasons: errors,
    };
  }

  // Generate prescription ID (would be created in actual system)
  const prescriptionId = `RX-${Date.now().toString(36).toUpperCase()}`;

  // Mark as processed
  const processedRecord = markIntakeProcessed(record, prescriptionId, userId);

  return {
    success: true,
    intakeRecord: processedRecord,
    prescriptionId,
    errors: [],
    warnings,
    requiresReview: false,
  };
}

/**
 * Get intake statistics
 */
export function calculateIntakeStatistics(records: IntakeRecord[]): {
  total: number;
  byChannel: Record<IntakeChannel, number>;
  byStatus: Record<IntakeStatus, number>;
  averageOcrConfidence: number;
  requiresReviewCount: number;
  processedToday: number;
} {
  const byChannel: Record<IntakeChannel, number> = {
    electronic: 0,
    fax: 0,
    hard_copy: 0,
    phone: 0,
    transfer_in: 0,
    refill_request: 0,
  };

  const byStatus: Record<IntakeStatus, number> = {
    pending: 0,
    ai_processing: 0,
    needs_review: 0,
    processed: 0,
    rejected: 0,
  };

  let ocrTotal = 0;
  let ocrCount = 0;
  let requiresReviewCount = 0;
  let processedToday = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const record of records) {
    byChannel[record.channel]++;
    byStatus[record.status]++;

    if (record.ocrConfidence !== undefined) {
      ocrTotal += record.ocrConfidence;
      ocrCount++;
    }

    if (record.status === 'needs_review') {
      requiresReviewCount++;
    }

    if (record.processedAt && record.processedAt >= today) {
      processedToday++;
    }
  }

  return {
    total: records.length,
    byChannel,
    byStatus,
    averageOcrConfidence: ocrCount > 0 ? Math.round(ocrTotal / ocrCount) : 0,
    requiresReviewCount,
    processedToday,
  };
}

/**
 * Filter intake records by criteria
 */
export function filterIntakeRecords(
  records: IntakeRecord[],
  filters: {
    channel?: IntakeChannel;
    status?: IntakeStatus;
    startDate?: Date;
    endDate?: Date;
    prescriberVerified?: boolean;
    hasOcrConfidence?: boolean;
    minOcrConfidence?: number;
  }
): IntakeRecord[] {
  return records.filter((record) => {
    if (filters.channel && record.channel !== filters.channel) {
      return false;
    }
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    if (filters.startDate && record.receivedAt < filters.startDate) {
      return false;
    }
    if (filters.endDate && record.receivedAt > filters.endDate) {
      return false;
    }
    if (
      filters.prescriberVerified !== undefined &&
      record.prescriberVerified !== filters.prescriberVerified
    ) {
      return false;
    }
    if (
      filters.hasOcrConfidence &&
      record.ocrConfidence === undefined
    ) {
      return false;
    }
    if (
      filters.minOcrConfidence !== undefined &&
      (record.ocrConfidence === undefined ||
        record.ocrConfidence < filters.minOcrConfidence)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Sort intake records by priority
 */
export function sortIntakeRecordsByPriority(
  records: IntakeRecord[]
): IntakeRecord[] {
  const priorityOrder: IntakeStatus[] = [
    'needs_review',
    'ai_processing',
    'pending',
    'processed',
    'rejected',
  ];

  const channelPriority: IntakeChannel[] = [
    'electronic',
    'phone',
    'transfer_in',
    'fax',
    'hard_copy',
    'refill_request',
  ];

  return [...records].sort((a, b) => {
    // Sort by status priority first
    const statusDiff =
      priorityOrder.indexOf(a.status) - priorityOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;

    // Then by channel priority
    const channelDiff =
      channelPriority.indexOf(a.channel) - channelPriority.indexOf(b.channel);
    if (channelDiff !== 0) return channelDiff;

    // Then by received date (oldest first)
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });
}
