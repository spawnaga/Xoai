/**
 * Prescription Pickup & Patient Verification Module
 *
 * Handles patient verification and prescription pickup:
 * - Retail patient search (2+2+DOB)
 * - Organization/facility pickup
 * - Signature capture (HIPAA/21 CFR Part 11 compliant)
 * - ID verification for controlled substances
 * - Will-call management with auto-reverse
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Pickup session type
 */
export type PickupSessionType = 'retail' | 'organization' | 'delivery' | 'drive_thru';

/**
 * Pickup status
 */
export type PickupStatus =
  | 'searching'
  | 'patient_selected'
  | 'prescriptions_scanned'
  | 'signature_required'
  | 'signature_captured'
  | 'id_verification'
  | 'counseling'
  | 'completed'
  | 'cancelled';

/**
 * Signature reason
 */
export type SignatureReason =
  | 'new_patient'
  | 'six_months_expired'
  | 'controlled_substance'
  | 'hipaa_acknowledgment'
  | 'counseling_declined'
  | 'delivery_receipt';

/**
 * ID type for verification
 */
export type IDType =
  | 'drivers_license'
  | 'state_id'
  | 'passport'
  | 'military_id'
  | 'tribal_id'
  | 'other';

/**
 * Counseling status
 */
export type CounselingStatus =
  | 'required'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'waived';

/**
 * Retail patient search criteria
 */
export interface RetailPickupSearch {
  // Standard: 2 chars first + 2 chars last + DOB
  firstNameChars: string; // Min 2 chars (or 1 with override)
  lastNameChars: string; // Min 2 chars (or 1 with override)
  dateOfBirth: string; // MM/DD/YYYY format

  // Single-letter name override (for names like "Li" or "Wu")
  singleLetterFirstName?: boolean;
  singleLetterLastName?: boolean;

  // Alternative: Full name search
  fullFirstName?: string;
  fullLastName?: string;

  // Additional identifiers
  phoneNumber?: string;
  rxNumber?: string;
}

/**
 * Organization/facility pickup
 */
export interface OrganizationPickupSearch {
  organizationName: string;
  phoneNumber?: string;
  facilityCode?: string;
  pickupPersonName?: string;
  deliveryRouteId?: string;
}

/**
 * Patient match result
 */
export interface PatientMatch {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone?: string;
  address?: string;
  prescriptionsReady: number;
  hasControlled: boolean;
  signatureRequired: boolean;
  signatureExpiredAt?: Date;
  lastPickupDate?: Date;
  matchScore: number; // 0-100
}

/**
 * Prescription ready for pickup
 */
export interface PickupPrescription {
  prescriptionId: string;
  rxNumber: string;
  drugName: string;
  strength: string;
  quantity: number;
  binLocation: string;
  barcode: string;
  scanned: boolean;
  scannedAt?: Date;
  scannedBy?: string;
  isControlled: boolean;
  deaSchedule?: string;
  requiresId: boolean;
  requiresCounseling: boolean;
  isRefrigerated: boolean;
  copayAmount?: number;
  dispensedAt?: Date;
  partialFill?: boolean;
}

/**
 * Signature capture data (21 CFR Part 11 compliant)
 */
export interface SignatureCapture {
  id: string;
  patientId: string;
  sessionId: string;

  // Signature data
  signatureImage: string; // Base64 encoded PNG
  signatureFormat: 'topaz' | 'epadlink' | 'scriptpro' | 'generic';
  signatureVector?: string; // Vector data if available
  deviceId?: string;
  deviceModel?: string;

  // Timestamp and location (21 CFR Part 11)
  capturedAt: Date;
  capturedBy: string; // Staff user ID
  stationId?: string;
  ipAddress?: string;

  // Consent acknowledgments
  reason: SignatureReason;
  hipaaAcknowledged: boolean;
  hipaaVersion?: string;
  counselingOffered: boolean;
  counselingAccepted: boolean;
  controlledSubstanceAcknowledged?: boolean;

  // Signature validity tracking
  expiresAt: Date; // 6 months from capture for HIPAA
  isValid: boolean;
}

/**
 * ID verification record
 */
export interface IDVerification {
  id: string;
  sessionId: string;
  patientId: string;
  verifiedAt: Date;
  verifiedBy: string;

  // ID details (partial for security)
  idType: IDType;
  idNumber: string; // Last 4-6 characters only
  idState?: string;
  idCountry?: string;
  expirationDate?: Date;
  isExpired: boolean;

  // Verification checks
  photoMatches: boolean;
  nameMatches: boolean;
  dobMatches: boolean;
  idValid: boolean;

  // Optional: ID scan data (if scanner available)
  scannedData?: string;
  scannerDeviceId?: string;
}

/**
 * Pickup session
 */
export interface PickupSession {
  id: string;
  sessionType: PickupSessionType;
  status: PickupStatus;

  // Search criteria
  searchCriteria: RetailPickupSearch | OrganizationPickupSearch;

  // Patient matching
  matchedPatients: PatientMatch[];
  selectedPatientId?: string;
  selectedPatientName?: string;

  // Prescriptions
  prescriptionsToPickup: PickupPrescription[];
  scannedBarcodes: string[];
  allScanned: boolean;
  totalCopay: number;

  // Signature requirements
  signatureRequired: boolean;
  signatureReasons: SignatureReason[];
  signatureData?: SignatureCapture;

  // ID verification (for controlled substances)
  idVerificationRequired: boolean;
  idVerification?: IDVerification;

  // Counseling
  counselingRequired: boolean;
  counselingStatus: CounselingStatus;
  counselingNotes?: string;
  pharmacistId?: string;

  // Payment
  paymentCollected: boolean;
  paymentAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'check' | 'account';
  receiptNumber?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  completedBy: string;
  stationId?: string;

  // Audit trail
  auditTrail: PickupAuditEntry[];
}

/**
 * Pickup audit entry
 */
export interface PickupAuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  details?: string;
  prescriptionId?: string;
}

/**
 * Enhanced will-call bin with auto-reverse
 */
export interface WillCallBinEnhanced {
  binId: string;
  binLocation: string;
  prescriptionId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  drugName: string;
  quantity: number;

  // Organization grouping
  organizationId?: string;
  organizationName?: string;
  groupCode?: string;

  // Timing
  placedAt: Date;
  returnToStockDate: Date; // placedAt + 10 days (configurable)
  daysInBin: number;
  daysUntilReturn: number;

  // Status flags
  isRefrigerated: boolean;
  isControlled: boolean;
  signatureOnFile: boolean;

  // Insurance reversal tracking
  insuranceReversed: boolean;
  reversedAt?: Date;
  reversedBy?: string;
  reversalTransactionId?: string;

  // Notifications
  pickupReminderSent: boolean;
  reminderSentAt?: Date;
  reminderCount: number;

  // Prescriber communication
  prescriberNotified: boolean;
  notifiedStatus?: 'filled' | 'on_hold' | 'returned';
  notifiedAt?: Date;
}

/**
 * Will-call expiration result
 */
export interface WillCallExpirationResult {
  toReverse: WillCallBinEnhanced[];
  toNotify: WillCallBinEnhanced[];
  reversed: WillCallBinEnhanced[];
  notificationsSent: number;
  errors: string[];
}

// ============================================
// SCHEMAS
// ============================================

export const RetailPickupSearchSchema = z.object({
  firstNameChars: z.string().min(1).max(50),
  lastNameChars: z.string().min(1).max(50),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  singleLetterFirstName: z.boolean().optional(),
  singleLetterLastName: z.boolean().optional(),
  fullFirstName: z.string().optional(),
  fullLastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  rxNumber: z.string().optional(),
});

export const OrganizationPickupSearchSchema = z.object({
  organizationName: z.string().min(1),
  phoneNumber: z.string().optional(),
  facilityCode: z.string().optional(),
  pickupPersonName: z.string().optional(),
  deliveryRouteId: z.string().optional(),
});

export const SignatureCaptureSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  sessionId: z.string(),
  signatureImage: z.string(),
  signatureFormat: z.enum(['topaz', 'epadlink', 'scriptpro', 'generic']),
  signatureVector: z.string().optional(),
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  capturedAt: z.date(),
  capturedBy: z.string(),
  stationId: z.string().optional(),
  ipAddress: z.string().optional(),
  reason: z.enum([
    'new_patient',
    'six_months_expired',
    'controlled_substance',
    'hipaa_acknowledgment',
    'counseling_declined',
    'delivery_receipt',
  ]),
  hipaaAcknowledged: z.boolean(),
  hipaaVersion: z.string().optional(),
  counselingOffered: z.boolean(),
  counselingAccepted: z.boolean(),
  controlledSubstanceAcknowledged: z.boolean().optional(),
  expiresAt: z.date(),
  isValid: z.boolean(),
});

export const IDVerificationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
  verifiedAt: z.date(),
  verifiedBy: z.string(),
  idType: z.enum([
    'drivers_license',
    'state_id',
    'passport',
    'military_id',
    'tribal_id',
    'other',
  ]),
  idNumber: z.string().max(10),
  idState: z.string().length(2).optional(),
  idCountry: z.string().optional(),
  expirationDate: z.date().optional(),
  isExpired: z.boolean(),
  photoMatches: z.boolean(),
  nameMatches: z.boolean(),
  dobMatches: z.boolean(),
  idValid: z.boolean(),
  scannedData: z.string().optional(),
  scannerDeviceId: z.string().optional(),
});

export const PickupSessionSchema = z.object({
  id: z.string(),
  sessionType: z.enum(['retail', 'organization', 'delivery', 'drive_thru']),
  status: z.enum([
    'searching',
    'patient_selected',
    'prescriptions_scanned',
    'signature_required',
    'signature_captured',
    'id_verification',
    'counseling',
    'completed',
    'cancelled',
  ]),
  selectedPatientId: z.string().optional(),
  selectedPatientName: z.string().optional(),
  allScanned: z.boolean(),
  totalCopay: z.number(),
  signatureRequired: z.boolean(),
  idVerificationRequired: z.boolean(),
  counselingRequired: z.boolean(),
  counselingStatus: z.enum([
    'required',
    'offered',
    'accepted',
    'declined',
    'completed',
    'waived',
  ]),
  paymentCollected: z.boolean(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  completedBy: z.string(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Default will-call return days
 */
export const DEFAULT_RETURN_DAYS = 10;

/**
 * Signature expiration months (HIPAA)
 */
export const SIGNATURE_EXPIRY_MONTHS = 6;

/**
 * Minimum search characters
 */
export const MIN_SEARCH_CHARS = 2;

/**
 * Signature reasons that require a new signature
 */
export const SIGNATURE_REASONS_DISPLAY: Record<SignatureReason, string> = {
  new_patient: 'New Patient - Initial HIPAA acknowledgment',
  six_months_expired: 'Signature expired (over 6 months)',
  controlled_substance: 'Controlled substance acknowledgment',
  hipaa_acknowledgment: 'HIPAA Notice acknowledgment',
  counseling_declined: 'Counseling declined documentation',
  delivery_receipt: 'Delivery receipt',
};

/**
 * ID types display names
 */
export const ID_TYPE_NAMES: Record<IDType, string> = {
  drivers_license: "Driver's License",
  state_id: 'State ID Card',
  passport: 'Passport',
  military_id: 'Military ID',
  tribal_id: 'Tribal ID',
  other: 'Other Government ID',
};

/**
 * DEA schedules requiring ID verification
 */
export const ID_REQUIRED_SCHEDULES = ['II', 'III', 'IV', 'V'];

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate pickup session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PU-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate signature ID
 */
export function generateSignatureId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `SIG-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate ID verification ID
 */
export function generateVerificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `IDV-${timestamp}-${random}`.toUpperCase();
}

/**
 * Validate retail search criteria
 */
export function validateRetailSearch(search: RetailPickupSearch): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate first name chars
  const minFirstChars = search.singleLetterFirstName ? 1 : MIN_SEARCH_CHARS;
  if (search.firstNameChars.length < minFirstChars) {
    errors.push(`First name must be at least ${minFirstChars} character(s)`);
  }

  // Validate last name chars
  const minLastChars = search.singleLetterLastName ? 1 : MIN_SEARCH_CHARS;
  if (search.lastNameChars.length < minLastChars) {
    errors.push(`Last name must be at least ${minLastChars} character(s)`);
  }

  // Validate DOB format
  const dobPattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
  if (!dobPattern.test(search.dateOfBirth)) {
    errors.push('Date of birth must be in MM/DD/YYYY format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new pickup session
 */
export function createPickupSession(
  sessionType: PickupSessionType,
  searchCriteria: RetailPickupSearch | OrganizationPickupSearch,
  userId: string,
  stationId?: string
): PickupSession {
  const now = new Date();

  return {
    id: generateSessionId(),
    sessionType,
    status: 'searching',
    searchCriteria,
    matchedPatients: [],
    prescriptionsToPickup: [],
    scannedBarcodes: [],
    allScanned: false,
    totalCopay: 0,
    signatureRequired: false,
    signatureReasons: [],
    idVerificationRequired: false,
    counselingRequired: false,
    counselingStatus: 'required',
    paymentCollected: false,
    startedAt: now,
    completedBy: userId,
    stationId,
    auditTrail: [
      {
        timestamp: now,
        action: 'session_started',
        userId,
        details: `Pickup session started (${sessionType})`,
      },
    ],
  };
}

/**
 * Select a patient for pickup
 */
export function selectPatient(
  session: PickupSession,
  patient: PatientMatch,
  prescriptions: PickupPrescription[],
  userId: string
): PickupSession {
  const now = new Date();

  // Determine signature requirements
  const signatureReasons: SignatureReason[] = [];

  if (patient.signatureRequired) {
    if (!patient.lastPickupDate) {
      signatureReasons.push('new_patient');
    } else if (patient.signatureExpiredAt && patient.signatureExpiredAt < now) {
      signatureReasons.push('six_months_expired');
    }
  }

  // Check for controlled substances
  const hasControlled = prescriptions.some((rx) => rx.isControlled);
  if (hasControlled) {
    signatureReasons.push('controlled_substance');
  }

  // Check for counseling requirements
  const requiresCounseling = prescriptions.some((rx) => rx.requiresCounseling);

  // Check for ID verification
  const idRequired = prescriptions.some((rx) => rx.requiresId);

  // Calculate total copay
  const totalCopay = prescriptions.reduce(
    (sum, rx) => sum + (rx.copayAmount || 0),
    0
  );

  return {
    ...session,
    status: 'patient_selected',
    selectedPatientId: patient.patientId,
    selectedPatientName: `${patient.firstName} ${patient.lastName}`,
    matchedPatients: session.matchedPatients,
    prescriptionsToPickup: prescriptions,
    signatureRequired: signatureReasons.length > 0,
    signatureReasons,
    idVerificationRequired: idRequired,
    counselingRequired: requiresCounseling,
    totalCopay,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'patient_selected',
        userId,
        details: `Selected patient: ${patient.firstName} ${patient.lastName} (${prescriptions.length} prescriptions)`,
      },
    ],
  };
}

/**
 * Scan a prescription barcode
 */
export function scanPrescription(
  session: PickupSession,
  barcode: string,
  userId: string
): { session: PickupSession; success: boolean; error?: string } {
  const now = new Date();

  // Find matching prescription
  const rxIndex = session.prescriptionsToPickup.findIndex(
    (rx) => rx.barcode === barcode
  );

  if (rxIndex === -1) {
    return {
      session,
      success: false,
      error: 'Barcode does not match any prescription in this pickup',
    };
  }

  const rx = session.prescriptionsToPickup[rxIndex];

  if (!rx) {
    return {
      session,
      success: false,
      error: 'Prescription not found at index',
    };
  }

  if (rx.scanned) {
    return {
      session,
      success: false,
      error: 'Prescription already scanned',
    };
  }

  // Update prescription
  const updatedPrescriptions = [...session.prescriptionsToPickup];
  updatedPrescriptions[rxIndex] = {
    ...rx,
    scanned: true,
    scannedAt: now,
    scannedBy: userId,
  };

  // Check if all scanned
  const allScanned = updatedPrescriptions.every((p) => p.scanned);
  const scannedBarcodes = [...session.scannedBarcodes, barcode];

  // Determine next status
  let nextStatus = session.status;
  if (allScanned) {
    if (session.signatureRequired) {
      nextStatus = 'signature_required';
    } else if (session.idVerificationRequired) {
      nextStatus = 'id_verification';
    } else if (session.counselingRequired) {
      nextStatus = 'counseling';
    } else {
      nextStatus = 'prescriptions_scanned';
    }
  }

  return {
    session: {
      ...session,
      status: nextStatus,
      prescriptionsToPickup: updatedPrescriptions,
      scannedBarcodes,
      allScanned,
      auditTrail: [
        ...session.auditTrail,
        {
          timestamp: now,
          action: 'prescription_scanned',
          userId,
          details: `Scanned: ${rx.rxNumber} - ${rx.drugName}`,
          prescriptionId: rx.prescriptionId,
        },
      ],
    },
    success: true,
  };
}

/**
 * Capture patient signature
 */
export function captureSignature(
  session: PickupSession,
  signatureImage: string,
  userId: string,
  options: {
    format?: 'topaz' | 'epadlink' | 'scriptpro' | 'generic';
    deviceId?: string;
    deviceModel?: string;
    stationId?: string;
    ipAddress?: string;
    hipaaAcknowledged: boolean;
    counselingOffered: boolean;
    counselingAccepted: boolean;
    controlledAcknowledged?: boolean;
  }
): PickupSession {
  const now = new Date();

  // Calculate signature expiration (6 months)
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + SIGNATURE_EXPIRY_MONTHS);

  const signature: SignatureCapture = {
    id: generateSignatureId(),
    patientId: session.selectedPatientId!,
    sessionId: session.id,
    signatureImage,
    signatureFormat: options.format || 'generic',
    deviceId: options.deviceId,
    deviceModel: options.deviceModel,
    capturedAt: now,
    capturedBy: userId,
    stationId: options.stationId || session.stationId,
    ipAddress: options.ipAddress,
    reason: session.signatureReasons[0] || 'hipaa_acknowledgment',
    hipaaAcknowledged: options.hipaaAcknowledged,
    counselingOffered: options.counselingOffered,
    counselingAccepted: options.counselingAccepted,
    controlledSubstanceAcknowledged: options.controlledAcknowledged,
    expiresAt,
    isValid: true,
  };

  // Determine next status
  let nextStatus: PickupStatus = 'signature_captured';
  if (session.idVerificationRequired) {
    nextStatus = 'id_verification';
  } else if (session.counselingRequired && !options.counselingAccepted) {
    nextStatus = 'counseling';
  }

  return {
    ...session,
    status: nextStatus,
    signatureData: signature,
    counselingStatus: options.counselingAccepted ? 'accepted' : 'offered',
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'signature_captured',
        userId,
        details: `Signature captured. HIPAA: ${options.hipaaAcknowledged}, Counseling: ${options.counselingAccepted ? 'Accepted' : 'Declined'}`,
      },
    ],
  };
}

/**
 * Verify patient ID
 */
export function verifyPatientId(
  session: PickupSession,
  verification: Omit<IDVerification, 'id' | 'sessionId' | 'patientId' | 'verifiedAt'>,
  userId: string
): PickupSession {
  const now = new Date();

  const idVerification: IDVerification = {
    id: generateVerificationId(),
    sessionId: session.id,
    patientId: session.selectedPatientId!,
    verifiedAt: now,
    ...verification,
    verifiedBy: userId,
  };

  // Determine next status
  let nextStatus: PickupStatus = 'id_verification';
  if (
    idVerification.idValid &&
    idVerification.photoMatches &&
    idVerification.nameMatches
  ) {
    if (session.counselingRequired && session.counselingStatus !== 'completed') {
      nextStatus = 'counseling';
    } else {
      nextStatus = 'prescriptions_scanned';
    }
  }

  return {
    ...session,
    status: nextStatus,
    idVerification,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'id_verified',
        userId,
        details: `ID verified: ${ID_TYPE_NAMES[verification.idType]} ending in ${verification.idNumber}`,
      },
    ],
  };
}

/**
 * Complete counseling
 */
export function completeCounseling(
  session: PickupSession,
  status: 'accepted' | 'declined' | 'completed' | 'waived',
  pharmacistId: string,
  notes?: string
): PickupSession {
  const now = new Date();

  return {
    ...session,
    counselingStatus: status,
    counselingNotes: notes,
    pharmacistId,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'counseling_' + status,
        userId: pharmacistId,
        details: notes || `Counseling ${status}`,
      },
    ],
  };
}

/**
 * Record payment
 */
export function recordPayment(
  session: PickupSession,
  amount: number,
  method: 'cash' | 'card' | 'check' | 'account',
  receiptNumber: string,
  userId: string
): PickupSession {
  const now = new Date();

  return {
    ...session,
    paymentCollected: true,
    paymentAmount: amount,
    paymentMethod: method,
    receiptNumber,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'payment_recorded',
        userId,
        details: `Payment: $${amount.toFixed(2)} via ${method}. Receipt: ${receiptNumber}`,
      },
    ],
  };
}

/**
 * Complete pickup session
 */
export function completePickup(
  session: PickupSession,
  userId: string
): { session: PickupSession; success: boolean; errors: string[] } {
  const now = new Date();
  const errors: string[] = [];

  // Validate all prescriptions scanned
  if (!session.allScanned) {
    errors.push('Not all prescriptions have been scanned');
  }

  // Validate signature if required
  if (session.signatureRequired && !session.signatureData) {
    errors.push('Signature is required but not captured');
  }

  // Validate ID if required
  if (session.idVerificationRequired && !session.idVerification?.idValid) {
    errors.push('ID verification is required but not completed');
  }

  // Validate counseling
  if (
    session.counselingRequired &&
    session.counselingStatus !== 'completed' &&
    session.counselingStatus !== 'declined' &&
    session.counselingStatus !== 'waived'
  ) {
    errors.push('Counseling status must be resolved');
  }

  // Validate payment
  if (session.totalCopay > 0 && !session.paymentCollected) {
    errors.push('Payment has not been collected');
  }

  if (errors.length > 0) {
    return { session, success: false, errors };
  }

  return {
    session: {
      ...session,
      status: 'completed',
      completedAt: now,
      completedBy: userId,
      auditTrail: [
        ...session.auditTrail,
        {
          timestamp: now,
          action: 'pickup_completed',
          userId,
          details: `Pickup completed. ${session.prescriptionsToPickup.length} prescriptions dispensed.`,
        },
      ],
    },
    success: true,
    errors: [],
  };
}

/**
 * Cancel pickup session
 */
export function cancelPickup(
  session: PickupSession,
  reason: string,
  userId: string
): PickupSession {
  const now = new Date();

  return {
    ...session,
    status: 'cancelled',
    completedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'pickup_cancelled',
        userId,
        details: `Pickup cancelled: ${reason}`,
      },
    ],
  };
}

/**
 * Check if signature is valid/current
 */
export function isSignatureValid(
  lastSignatureDate?: Date,
  expiryMonths: number = SIGNATURE_EXPIRY_MONTHS
): boolean {
  if (!lastSignatureDate) return false;

  const expirationDate = new Date(lastSignatureDate);
  expirationDate.setMonth(expirationDate.getMonth() + expiryMonths);

  return new Date() < expirationDate;
}

/**
 * Calculate signature expiration date
 */
export function calculateSignatureExpiration(
  signatureDate: Date,
  expiryMonths: number = SIGNATURE_EXPIRY_MONTHS
): Date {
  const expiration = new Date(signatureDate);
  expiration.setMonth(expiration.getMonth() + expiryMonths);
  return expiration;
}

/**
 * Create will-call bin entry
 */
export function createWillCallBin(
  prescription: PickupPrescription,
  patientId: string,
  patientName: string,
  binLocation: string,
  options?: {
    organizationId?: string;
    organizationName?: string;
    groupCode?: string;
    returnDays?: number;
  }
): WillCallBinEnhanced {
  const now = new Date();
  const returnDays = options?.returnDays || DEFAULT_RETURN_DAYS;
  const returnDate = new Date(now);
  returnDate.setDate(returnDate.getDate() + returnDays);

  return {
    binId: `WC-${Date.now().toString(36)}`.toUpperCase(),
    binLocation,
    prescriptionId: prescription.prescriptionId,
    rxNumber: prescription.rxNumber,
    patientId,
    patientName,
    drugName: prescription.drugName,
    quantity: prescription.quantity,
    organizationId: options?.organizationId,
    organizationName: options?.organizationName,
    groupCode: options?.groupCode,
    placedAt: now,
    returnToStockDate: returnDate,
    daysInBin: 0,
    daysUntilReturn: returnDays,
    isRefrigerated: prescription.isRefrigerated,
    isControlled: prescription.isControlled,
    signatureOnFile: false,
    insuranceReversed: false,
    pickupReminderSent: false,
    reminderCount: 0,
    prescriberNotified: false,
  };
}

/**
 * Update will-call bin days
 */
export function updateWillCallDays(bin: WillCallBinEnhanced): WillCallBinEnhanced {
  const now = new Date();
  const daysInBin = Math.floor(
    (now.getTime() - bin.placedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilReturn = Math.max(
    0,
    Math.ceil(
      (bin.returnToStockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return {
    ...bin,
    daysInBin,
    daysUntilReturn,
  };
}

/**
 * Process will-call expirations
 */
export function processWillCallExpiration(
  bins: WillCallBinEnhanced[],
  options?: {
    sendReminders?: boolean;
    reminderDaysBefore?: number;
  }
): WillCallExpirationResult {
  const now = new Date();
  const reminderDays = options?.reminderDaysBefore || 3;

  const result: WillCallExpirationResult = {
    toReverse: [],
    toNotify: [],
    reversed: [],
    notificationsSent: 0,
    errors: [],
  };

  for (const bin of bins) {
    const updatedBin = updateWillCallDays(bin);

    // Check if ready for return to stock
    if (updatedBin.daysUntilReturn === 0 && !updatedBin.insuranceReversed) {
      result.toReverse.push(updatedBin);
    }

    // Check if reminder should be sent
    if (
      options?.sendReminders &&
      updatedBin.daysUntilReturn === reminderDays &&
      !updatedBin.pickupReminderSent
    ) {
      result.toNotify.push(updatedBin);
    }
  }

  return result;
}

/**
 * Mark will-call as reversed
 */
export function markWillCallReversed(
  bin: WillCallBinEnhanced,
  userId: string,
  transactionId?: string
): WillCallBinEnhanced {
  return {
    ...bin,
    insuranceReversed: true,
    reversedAt: new Date(),
    reversedBy: userId,
    reversalTransactionId: transactionId,
  };
}

/**
 * Mark reminder sent
 */
export function markReminderSent(bin: WillCallBinEnhanced): WillCallBinEnhanced {
  return {
    ...bin,
    pickupReminderSent: true,
    reminderSentAt: new Date(),
    reminderCount: bin.reminderCount + 1,
  };
}

/**
 * Get bins ready for return to stock
 */
export function getReadyForReturn(bins: WillCallBinEnhanced[]): WillCallBinEnhanced[] {
  const now = new Date();
  return bins.filter((bin) => bin.returnToStockDate <= now && !bin.insuranceReversed);
}

/**
 * Get bins expiring soon (within specified days)
 */
export function getExpiringSoon(
  bins: WillCallBinEnhanced[],
  daysThreshold: number = 3
): WillCallBinEnhanced[] {
  return bins
    .map(updateWillCallDays)
    .filter(
      (bin) =>
        bin.daysUntilReturn <= daysThreshold &&
        bin.daysUntilReturn > 0 &&
        !bin.insuranceReversed
    );
}

/**
 * Search patients for pickup (2+2+DOB matching)
 */
export function matchPatients(
  patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    phone?: string;
    address?: string;
  }>,
  search: RetailPickupSearch
): PatientMatch[] {
  const matches: PatientMatch[] = [];

  // Parse DOB from search
  const dobParts = search.dateOfBirth.split('/').map(Number);
  const month = dobParts[0] ?? 1;
  const day = dobParts[1] ?? 1;
  const year = dobParts[2] ?? 2000;
  const searchDOB = new Date(year, month - 1, day);

  for (const patient of patients) {
    // Check DOB match
    const patientDOB = new Date(patient.dateOfBirth);
    if (
      patientDOB.getFullYear() !== searchDOB.getFullYear() ||
      patientDOB.getMonth() !== searchDOB.getMonth() ||
      patientDOB.getDate() !== searchDOB.getDate()
    ) {
      continue;
    }

    // Check name prefix match
    const firstNameMatch = patient.firstName
      .toLowerCase()
      .startsWith(search.firstNameChars.toLowerCase());
    const lastNameMatch = patient.lastName
      .toLowerCase()
      .startsWith(search.lastNameChars.toLowerCase());

    if (!firstNameMatch || !lastNameMatch) {
      continue;
    }

    // Calculate match score
    let matchScore = 50; // Base score for DOB match
    matchScore += search.firstNameChars.length * 10;
    matchScore += search.lastNameChars.length * 10;

    // Full name bonus
    if (search.fullFirstName && patient.firstName.toLowerCase() === search.fullFirstName.toLowerCase()) {
      matchScore += 15;
    }
    if (search.fullLastName && patient.lastName.toLowerCase() === search.fullLastName.toLowerCase()) {
      matchScore += 15;
    }

    // Phone match bonus
    if (search.phoneNumber && patient.phone) {
      const searchPhone = search.phoneNumber.replace(/\D/g, '');
      const patientPhone = patient.phone.replace(/\D/g, '');
      if (patientPhone.includes(searchPhone) || searchPhone.includes(patientPhone)) {
        matchScore += 20;
      }
    }

    matches.push({
      patientId: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patientDOB,
      phone: patient.phone,
      address: patient.address,
      prescriptionsReady: 0, // To be populated by caller
      hasControlled: false, // To be populated by caller
      signatureRequired: false, // To be populated by caller
      matchScore: Math.min(100, matchScore),
    });
  }

  // Sort by match score
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Mask ID number for display (show last 4)
 */
export function maskIdNumber(idNumber: string): string {
  if (idNumber.length <= 4) return idNumber;
  return '*'.repeat(idNumber.length - 4) + idNumber.slice(-4);
}

/**
 * Format pickup session summary
 */
export function formatPickupSummary(session: PickupSession): string {
  const lines: string[] = [];

  lines.push('='.repeat(50));
  lines.push('PICKUP SUMMARY');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Session ID: ${session.id}`);
  lines.push(`Type: ${session.sessionType.toUpperCase()}`);
  lines.push(`Status: ${session.status.toUpperCase()}`);
  lines.push('');

  if (session.selectedPatientName) {
    lines.push(`Patient: ${session.selectedPatientName}`);
  }

  lines.push('');
  lines.push('PRESCRIPTIONS');
  lines.push('-'.repeat(30));
  for (const rx of session.prescriptionsToPickup) {
    const status = rx.scanned ? '[X]' : '[ ]';
    const controlled = rx.isControlled ? ' (CS)' : '';
    lines.push(`${status} ${rx.rxNumber}: ${rx.drugName}${controlled}`);
  }
  lines.push('');

  if (session.totalCopay > 0) {
    lines.push(`Total Copay: $${session.totalCopay.toFixed(2)}`);
    lines.push(`Payment Collected: ${session.paymentCollected ? 'YES' : 'NO'}`);
  }

  lines.push('');
  lines.push(`Signature Required: ${session.signatureRequired ? 'YES' : 'NO'}`);
  lines.push(`ID Verification: ${session.idVerificationRequired ? 'YES' : 'NO'}`);
  lines.push(`Counseling: ${session.counselingStatus.toUpperCase()}`);
  lines.push('');

  if (session.completedAt) {
    lines.push(`Completed At: ${session.completedAt.toISOString()}`);
  }
  lines.push(`Completed By: ${session.completedBy}`);
  lines.push('');
  lines.push('='.repeat(50));

  return lines.join('\n');
}
