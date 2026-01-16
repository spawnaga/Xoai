/**
 * AI-Assisted Data Entry Module
 *
 * Provides AI-powered prescription data extraction and interpretation:
 * - OCR processing with confidence scoring
 * - Field-by-field extraction and validation
 * - Manual override workflow for low-confidence fields
 * - Audit trail for all AI interpretations
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * AI model provider
 */
export type AIModelProvider = 'gemini' | 'openai' | 'custom_ocr';

/**
 * OCR provider
 */
export type OCRProvider = 'documo' | 'google_vision' | 'aws_textract';

/**
 * Field names for AI extraction
 */
export type AIExtractionField =
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientMiddleName'
  | 'patientDOB'
  | 'patientAddress'
  | 'patientPhone'
  | 'drugName'
  | 'strength'
  | 'strengthUnit'
  | 'quantity'
  | 'quantityUnit'
  | 'daysSupply'
  | 'sig'
  | 'refillsAuthorized'
  | 'prescriberName'
  | 'prescriberDEA'
  | 'prescriberNPI'
  | 'prescriberPhone'
  | 'prescriberAddress'
  | 'writtenDate'
  | 'diagnosis'
  | 'icd10Code'
  | 'dawCode'
  | 'priorAuthNumber';

/**
 * Field acceptance status
 */
export type FieldAcceptanceStatus =
  | 'pending'
  | 'auto_accepted'
  | 'manually_accepted'
  | 'manually_overridden'
  | 'rejected';

/**
 * AI field extraction result
 */
export interface AIFieldResult {
  fieldName: AIExtractionField;
  extractedValue: string;
  confidence: number; // 0-100
  alternativeValues?: string[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page?: number;
  };
  needsConfirmation: boolean; // < 85% confidence
  autoAccepted: boolean; // >= 95% confidence
  validationErrors?: string[];
  validationWarnings?: string[];
}

/**
 * AI interpretation result
 */
export interface AIInterpretation {
  id: string;
  intakeId: string;
  processedAt: Date;
  model: AIModelProvider;
  modelVersion?: string;
  ocrProvider?: OCRProvider;

  // Raw OCR output
  rawText?: string;
  pageCount?: number;

  // Field-by-field interpretation with confidence
  fields: AIFieldResult[];

  // Overall metrics
  overallConfidence: number; // 0-100
  fieldsExtracted: number;
  fieldsAutoAccepted: number;
  fieldsNeedingReview: number;

  requiresManualReview: boolean;
  reviewReasons: string[];
  suggestedActions: string[];

  // Processing metadata
  processingTimeMs: number;
  imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  errors?: string[];
}

/**
 * Field status in data entry session
 */
export interface FieldEntryStatus {
  fieldName: AIExtractionField;
  aiValue?: string;
  aiConfidence?: number;
  manualValue?: string;
  finalValue: string;
  status: FieldAcceptanceStatus;
  acceptedBy?: string;
  acceptedAt?: Date;
  overrideReason?: string;
}

/**
 * Data entry session
 */
export interface DataEntrySession {
  id: string;
  intakeId: string;
  aiInterpretationId?: string;
  aiInterpretation?: AIInterpretation;

  // Track field-by-field acceptance
  fieldStatus: Record<AIExtractionField, FieldEntryStatus>;

  // Session status
  allFieldsAccepted: boolean;
  fieldsAccepted: number;
  fieldsRemaining: number;
  completionPercentage: number;

  // User tracking
  enteredBy: string;
  supervisedBy?: string; // For trainees
  supervisorApproval?: boolean;

  // Timing
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  timeSpentMs: number;

  // Audit
  auditTrail: DataEntryAuditEntry[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data entry audit entry
 */
export interface DataEntryAuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  fieldName?: AIExtractionField;
  previousValue?: string;
  newValue?: string;
  details?: string;
}

/**
 * OCR processing request
 */
export interface OCRRequest {
  imageData: string; // Base64 encoded
  imageFormat: 'png' | 'jpg' | 'tiff' | 'pdf';
  pageNumber?: number;
  provider: OCRProvider;
  enhanceImage?: boolean;
  language?: string;
}

/**
 * OCR processing result
 */
export interface OCRResult {
  success: boolean;
  rawText: string;
  confidence: number;
  words: OCRWord[];
  blocks: OCRBlock[];
  processingTimeMs: number;
  errors?: string[];
}

/**
 * OCR word with position
 */
export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * OCR text block
 */
export interface OCRBlock {
  text: string;
  type: 'text' | 'table' | 'form_field' | 'signature';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * AI extraction request
 */
export interface AIExtractionRequest {
  ocrResult: OCRResult;
  model: AIModelProvider;
  fieldsToExtract: AIExtractionField[];
  context?: {
    patientName?: string;
    prescriberName?: string;
    previousPrescriptions?: string[];
  };
}

// ============================================
// SCHEMAS
// ============================================

export const AIFieldResultSchema = z.object({
  fieldName: z.enum([
    'patientFirstName',
    'patientLastName',
    'patientMiddleName',
    'patientDOB',
    'patientAddress',
    'patientPhone',
    'drugName',
    'strength',
    'strengthUnit',
    'quantity',
    'quantityUnit',
    'daysSupply',
    'sig',
    'refillsAuthorized',
    'prescriberName',
    'prescriberDEA',
    'prescriberNPI',
    'prescriberPhone',
    'prescriberAddress',
    'writtenDate',
    'diagnosis',
    'icd10Code',
    'dawCode',
    'priorAuthNumber',
  ]),
  extractedValue: z.string(),
  confidence: z.number().min(0).max(100),
  alternativeValues: z.array(z.string()).optional(),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      page: z.number().optional(),
    })
    .optional(),
  needsConfirmation: z.boolean(),
  autoAccepted: z.boolean(),
  validationErrors: z.array(z.string()).optional(),
  validationWarnings: z.array(z.string()).optional(),
});

export const AIInterpretationSchema = z.object({
  id: z.string(),
  intakeId: z.string(),
  processedAt: z.date(),
  model: z.enum(['gemini', 'openai', 'custom_ocr']),
  modelVersion: z.string().optional(),
  ocrProvider: z.enum(['documo', 'google_vision', 'aws_textract']).optional(),
  rawText: z.string().optional(),
  pageCount: z.number().optional(),
  fields: z.array(AIFieldResultSchema),
  overallConfidence: z.number().min(0).max(100),
  fieldsExtracted: z.number(),
  fieldsAutoAccepted: z.number(),
  fieldsNeedingReview: z.number(),
  requiresManualReview: z.boolean(),
  reviewReasons: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  processingTimeMs: z.number(),
  imageQuality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  errors: z.array(z.string()).optional(),
});

export const DataEntrySessionSchema = z.object({
  id: z.string(),
  intakeId: z.string(),
  aiInterpretationId: z.string().optional(),
  allFieldsAccepted: z.boolean(),
  fieldsAccepted: z.number(),
  fieldsRemaining: z.number(),
  completionPercentage: z.number(),
  enteredBy: z.string(),
  supervisedBy: z.string().optional(),
  supervisorApproval: z.boolean().optional(),
  startedAt: z.date(),
  lastActivityAt: z.date(),
  completedAt: z.date().optional(),
  timeSpentMs: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * All extraction fields
 */
export const AI_EXTRACTION_FIELDS: AIExtractionField[] = [
  'patientFirstName',
  'patientLastName',
  'patientMiddleName',
  'patientDOB',
  'patientAddress',
  'patientPhone',
  'drugName',
  'strength',
  'strengthUnit',
  'quantity',
  'quantityUnit',
  'daysSupply',
  'sig',
  'refillsAuthorized',
  'prescriberName',
  'prescriberDEA',
  'prescriberNPI',
  'prescriberPhone',
  'prescriberAddress',
  'writtenDate',
  'diagnosis',
  'icd10Code',
  'dawCode',
  'priorAuthNumber',
];

/**
 * Required fields for prescription creation
 */
export const REQUIRED_FIELDS: AIExtractionField[] = [
  'patientFirstName',
  'patientLastName',
  'patientDOB',
  'drugName',
  'quantity',
  'sig',
  'prescriberName',
];

/**
 * Field display names
 */
export const FIELD_DISPLAY_NAMES: Record<AIExtractionField, string> = {
  patientFirstName: 'Patient First Name',
  patientLastName: 'Patient Last Name',
  patientMiddleName: 'Patient Middle Name',
  patientDOB: 'Patient Date of Birth',
  patientAddress: 'Patient Address',
  patientPhone: 'Patient Phone',
  drugName: 'Drug Name',
  strength: 'Strength',
  strengthUnit: 'Strength Unit',
  quantity: 'Quantity',
  quantityUnit: 'Quantity Unit',
  daysSupply: 'Days Supply',
  sig: 'Directions (SIG)',
  refillsAuthorized: 'Refills Authorized',
  prescriberName: 'Prescriber Name',
  prescriberDEA: 'Prescriber DEA',
  prescriberNPI: 'Prescriber NPI',
  prescriberPhone: 'Prescriber Phone',
  prescriberAddress: 'Prescriber Address',
  writtenDate: 'Written Date',
  diagnosis: 'Diagnosis',
  icd10Code: 'ICD-10 Code',
  dawCode: 'DAW Code',
  priorAuthNumber: 'Prior Auth Number',
};

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Fields at or above this are auto-accepted */
  AUTO_ACCEPT: 95,
  /** Fields below this require confirmation */
  NEEDS_CONFIRMATION: 85,
  /** Fields below this are flagged for review */
  LOW_CONFIDENCE: 70,
  /** Fields below this are considered unreliable */
  UNRELIABLE: 50,
};

/**
 * Image quality thresholds (based on overall OCR confidence)
 */
export const IMAGE_QUALITY_THRESHOLDS = {
  excellent: 95,
  good: 85,
  fair: 70,
  poor: 0,
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate AI interpretation ID
 */
export function generateInterpretationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AI-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate data entry session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DES-${timestamp}-${random}`.toUpperCase();
}

/**
 * Determine image quality from OCR confidence
 */
export function determineImageQuality(
  ocrConfidence: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (ocrConfidence >= IMAGE_QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (ocrConfidence >= IMAGE_QUALITY_THRESHOLDS.good) return 'good';
  if (ocrConfidence >= IMAGE_QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/**
 * Determine if field should be auto-accepted based on confidence
 */
export function shouldAutoAcceptField(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLDS.AUTO_ACCEPT;
}

/**
 * Determine if field needs confirmation
 */
export function fieldNeedsConfirmation(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLDS.NEEDS_CONFIRMATION;
}

/**
 * Validate extracted field value
 */
export function validateFieldValue(
  fieldName: AIExtractionField,
  value: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!value || value.trim() === '') {
    if (REQUIRED_FIELDS.includes(fieldName)) {
      errors.push(`${FIELD_DISPLAY_NAMES[fieldName]} is required`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  switch (fieldName) {
    case 'patientDOB':
    case 'writtenDate': {
      const datePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
      if (!datePattern.test(value)) {
        errors.push(`Invalid date format: ${value}`);
      }
      break;
    }

    case 'prescriberNPI': {
      if (!/^\d{10}$/.test(value)) {
        errors.push('NPI must be exactly 10 digits');
      }
      break;
    }

    case 'prescriberDEA': {
      if (!/^[A-Z]{2}\d{7}$/i.test(value)) {
        errors.push('Invalid DEA number format');
      }
      break;
    }

    case 'quantity': {
      const qty = parseFloat(value);
      if (isNaN(qty) || qty <= 0) {
        errors.push('Quantity must be a positive number');
      }
      if (qty > 9999) {
        warnings.push('Unusually high quantity - please verify');
      }
      break;
    }

    case 'daysSupply': {
      const days = parseInt(value, 10);
      if (isNaN(days) || days <= 0) {
        errors.push('Days supply must be a positive integer');
      }
      if (days > 365) {
        warnings.push('Days supply exceeds 365 - please verify');
      }
      break;
    }

    case 'refillsAuthorized': {
      const refills = parseInt(value, 10);
      if (isNaN(refills) || refills < 0) {
        errors.push('Refills must be a non-negative integer');
      }
      if (refills > 12) {
        warnings.push('High refill count - please verify');
      }
      break;
    }

    case 'icd10Code': {
      if (!/^[A-Z]\d{2}(\.\d{1,4})?$/i.test(value)) {
        warnings.push('ICD-10 code format may be incorrect');
      }
      break;
    }

    case 'dawCode': {
      if (!/^[0-9]$/.test(value)) {
        errors.push('DAW code must be a single digit (0-9)');
      }
      break;
    }

    case 'patientPhone':
    case 'prescriberPhone': {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        warnings.push('Phone number appears incomplete');
      }
      break;
    }

    case 'sig': {
      if (value.length < 5) {
        warnings.push('Directions appear incomplete');
      }
      break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Create AI field result
 */
export function createFieldResult(
  fieldName: AIExtractionField,
  extractedValue: string,
  confidence: number,
  alternativeValues?: string[]
): AIFieldResult {
  const validation = validateFieldValue(fieldName, extractedValue);

  return {
    fieldName,
    extractedValue,
    confidence,
    alternativeValues,
    needsConfirmation: fieldNeedsConfirmation(confidence),
    autoAccepted: shouldAutoAcceptField(confidence) && validation.valid,
    validationErrors:
      validation.errors.length > 0 ? validation.errors : undefined,
    validationWarnings:
      validation.warnings.length > 0 ? validation.warnings : undefined,
  };
}

/**
 * Create AI interpretation result
 */
export function createInterpretation(
  intakeId: string,
  model: AIModelProvider,
  fields: AIFieldResult[],
  processingTimeMs: number,
  options?: {
    modelVersion?: string;
    ocrProvider?: OCRProvider;
    rawText?: string;
    pageCount?: number;
    imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  }
): AIInterpretation {
  const fieldsAutoAccepted = fields.filter((f) => f.autoAccepted).length;
  const fieldsNeedingReview = fields.filter((f) => f.needsConfirmation).length;

  // Calculate overall confidence as weighted average
  const totalConfidence = fields.reduce((sum, f) => sum + f.confidence, 0);
  const overallConfidence =
    fields.length > 0 ? Math.round(totalConfidence / fields.length) : 0;

  // Determine if manual review is required
  const reviewReasons: string[] = [];
  const suggestedActions: string[] = [];

  if (fieldsNeedingReview > 0) {
    reviewReasons.push(
      `${fieldsNeedingReview} field(s) have low confidence and need verification`
    );
  }

  // Check for missing required fields
  const extractedFieldNames = fields.map((f) => f.fieldName);
  const missingRequired = REQUIRED_FIELDS.filter(
    (f) => !extractedFieldNames.includes(f)
  );
  if (missingRequired.length > 0) {
    reviewReasons.push(
      `Missing required fields: ${missingRequired.map((f) => FIELD_DISPLAY_NAMES[f]).join(', ')}`
    );
    suggestedActions.push('Manually enter missing required fields');
  }

  // Check for validation errors
  const fieldsWithErrors = fields.filter(
    (f) => f.validationErrors && f.validationErrors.length > 0
  );
  if (fieldsWithErrors.length > 0) {
    reviewReasons.push(
      `${fieldsWithErrors.length} field(s) have validation errors`
    );
    suggestedActions.push('Review and correct fields with validation errors');
  }

  // Image quality issues
  if (options?.imageQuality === 'poor') {
    reviewReasons.push('Poor image quality may affect accuracy');
    suggestedActions.push('Consider rescanning or requesting new prescription');
  }

  const requiresManualReview = reviewReasons.length > 0;

  return {
    id: generateInterpretationId(),
    intakeId,
    processedAt: new Date(),
    model,
    modelVersion: options?.modelVersion,
    ocrProvider: options?.ocrProvider,
    rawText: options?.rawText,
    pageCount: options?.pageCount,
    fields,
    overallConfidence,
    fieldsExtracted: fields.length,
    fieldsAutoAccepted,
    fieldsNeedingReview,
    requiresManualReview,
    reviewReasons,
    suggestedActions,
    processingTimeMs,
    imageQuality: options?.imageQuality,
  };
}

/**
 * Create data entry session
 */
export function createDataEntrySession(
  intakeId: string,
  enteredBy: string,
  aiInterpretation?: AIInterpretation,
  supervisedBy?: string
): DataEntrySession {
  const now = new Date();

  // Initialize field status from AI interpretation or as empty
  const fieldStatus: Record<AIExtractionField, FieldEntryStatus> =
    {} as Record<AIExtractionField, FieldEntryStatus>;

  let fieldsAccepted = 0;

  for (const fieldName of AI_EXTRACTION_FIELDS) {
    const aiField = aiInterpretation?.fields.find(
      (f) => f.fieldName === fieldName
    );

    if (aiField) {
      const status: FieldAcceptanceStatus = aiField.autoAccepted
        ? 'auto_accepted'
        : 'pending';

      if (status === 'auto_accepted') {
        fieldsAccepted++;
      }

      fieldStatus[fieldName] = {
        fieldName,
        aiValue: aiField.extractedValue,
        aiConfidence: aiField.confidence,
        finalValue: aiField.extractedValue,
        status,
        acceptedAt: status === 'auto_accepted' ? now : undefined,
      };
    } else {
      fieldStatus[fieldName] = {
        fieldName,
        finalValue: '',
        status: 'pending',
      };
    }
  }

  const fieldsRemaining = AI_EXTRACTION_FIELDS.length - fieldsAccepted;
  const completionPercentage = Math.round(
    (fieldsAccepted / AI_EXTRACTION_FIELDS.length) * 100
  );

  return {
    id: generateSessionId(),
    intakeId,
    aiInterpretationId: aiInterpretation?.id,
    aiInterpretation,
    fieldStatus,
    allFieldsAccepted: fieldsRemaining === 0,
    fieldsAccepted,
    fieldsRemaining,
    completionPercentage,
    enteredBy,
    supervisedBy,
    startedAt: now,
    lastActivityAt: now,
    timeSpentMs: 0,
    auditTrail: [
      {
        timestamp: now,
        action: 'session_started',
        userId: enteredBy,
        details: aiInterpretation
          ? `Session started with AI interpretation ${aiInterpretation.id}`
          : 'Session started for manual entry',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Accept AI value for a field
 */
export function acceptAIValue(
  session: DataEntrySession,
  fieldName: AIExtractionField,
  userId: string
): DataEntrySession {
  const now = new Date();
  const fieldEntry = session.fieldStatus[fieldName];

  if (!fieldEntry.aiValue) {
    return session; // No AI value to accept
  }

  const updatedFieldStatus = {
    ...session.fieldStatus,
    [fieldName]: {
      ...fieldEntry,
      status: 'manually_accepted' as FieldAcceptanceStatus,
      finalValue: fieldEntry.aiValue,
      acceptedBy: userId,
      acceptedAt: now,
    },
  };

  const wasAccepted = fieldEntry.status === 'auto_accepted' ||
                      fieldEntry.status === 'manually_accepted' ||
                      fieldEntry.status === 'manually_overridden';
  const fieldsAccepted = session.fieldsAccepted + (wasAccepted ? 0 : 1);
  const fieldsRemaining = AI_EXTRACTION_FIELDS.length - fieldsAccepted;

  return {
    ...session,
    fieldStatus: updatedFieldStatus,
    fieldsAccepted,
    fieldsRemaining,
    allFieldsAccepted: fieldsRemaining === 0,
    completionPercentage: Math.round(
      (fieldsAccepted / AI_EXTRACTION_FIELDS.length) * 100
    ),
    lastActivityAt: now,
    timeSpentMs: now.getTime() - session.startedAt.getTime(),
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'field_accepted',
        userId,
        fieldName,
        newValue: fieldEntry.aiValue,
        details: `Accepted AI value with ${fieldEntry.aiConfidence}% confidence`,
      },
    ],
  };
}

/**
 * Override field value manually
 */
export function overrideFieldValue(
  session: DataEntrySession,
  fieldName: AIExtractionField,
  newValue: string,
  userId: string,
  reason?: string
): DataEntrySession {
  const now = new Date();
  const fieldEntry = session.fieldStatus[fieldName];

  const updatedFieldStatus = {
    ...session.fieldStatus,
    [fieldName]: {
      ...fieldEntry,
      manualValue: newValue,
      finalValue: newValue,
      status: 'manually_overridden' as FieldAcceptanceStatus,
      acceptedBy: userId,
      acceptedAt: now,
      overrideReason: reason,
    },
  };

  const wasAccepted = fieldEntry.status === 'auto_accepted' ||
                      fieldEntry.status === 'manually_accepted' ||
                      fieldEntry.status === 'manually_overridden';
  const fieldsAccepted = session.fieldsAccepted + (wasAccepted ? 0 : 1);
  const fieldsRemaining = AI_EXTRACTION_FIELDS.length - fieldsAccepted;

  return {
    ...session,
    fieldStatus: updatedFieldStatus,
    fieldsAccepted,
    fieldsRemaining,
    allFieldsAccepted: fieldsRemaining === 0,
    completionPercentage: Math.round(
      (fieldsAccepted / AI_EXTRACTION_FIELDS.length) * 100
    ),
    lastActivityAt: now,
    timeSpentMs: now.getTime() - session.startedAt.getTime(),
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'field_overridden',
        userId,
        fieldName,
        previousValue: fieldEntry.aiValue || fieldEntry.finalValue,
        newValue,
        details: reason || 'Manual override without reason',
      },
    ],
  };
}

/**
 * Reject a field value
 */
export function rejectFieldValue(
  session: DataEntrySession,
  fieldName: AIExtractionField,
  userId: string,
  reason: string
): DataEntrySession {
  const now = new Date();
  const fieldEntry = session.fieldStatus[fieldName];

  const wasAccepted = fieldEntry.status === 'auto_accepted' ||
                      fieldEntry.status === 'manually_accepted' ||
                      fieldEntry.status === 'manually_overridden';

  const updatedFieldStatus = {
    ...session.fieldStatus,
    [fieldName]: {
      ...fieldEntry,
      status: 'rejected' as FieldAcceptanceStatus,
      finalValue: '',
      overrideReason: reason,
    },
  };

  const fieldsAccepted = session.fieldsAccepted - (wasAccepted ? 1 : 0);
  const fieldsRemaining = AI_EXTRACTION_FIELDS.length - fieldsAccepted;

  return {
    ...session,
    fieldStatus: updatedFieldStatus,
    fieldsAccepted,
    fieldsRemaining,
    allFieldsAccepted: false,
    completionPercentage: Math.round(
      (fieldsAccepted / AI_EXTRACTION_FIELDS.length) * 100
    ),
    lastActivityAt: now,
    timeSpentMs: now.getTime() - session.startedAt.getTime(),
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'field_rejected',
        userId,
        fieldName,
        previousValue: fieldEntry.finalValue,
        details: reason,
      },
    ],
  };
}

/**
 * Complete data entry session
 */
export function completeDataEntrySession(
  session: DataEntrySession,
  userId: string
): DataEntrySession {
  const now = new Date();

  // Check if all required fields are filled
  const missingRequired = REQUIRED_FIELDS.filter((fieldName) => {
    const field = session.fieldStatus[fieldName];
    return !field.finalValue || field.status === 'rejected';
  });

  if (missingRequired.length > 0) {
    throw new Error(
      `Cannot complete session: missing required fields: ${missingRequired.join(', ')}`
    );
  }

  return {
    ...session,
    completedAt: now,
    lastActivityAt: now,
    timeSpentMs: now.getTime() - session.startedAt.getTime(),
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'session_completed',
        userId,
        details: `Data entry completed in ${Math.round((now.getTime() - session.startedAt.getTime()) / 1000)} seconds`,
      },
    ],
  };
}

/**
 * Request supervisor approval
 */
export function requestSupervisorApproval(
  session: DataEntrySession,
  supervisorId: string
): DataEntrySession {
  const now = new Date();

  return {
    ...session,
    supervisedBy: supervisorId,
    lastActivityAt: now,
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'supervisor_approval_requested',
        userId: session.enteredBy,
        details: `Supervisor approval requested from ${supervisorId}`,
      },
    ],
  };
}

/**
 * Approve session by supervisor
 */
export function approveBySuperviser(
  session: DataEntrySession,
  supervisorId: string
): DataEntrySession {
  const now = new Date();

  return {
    ...session,
    supervisorApproval: true,
    lastActivityAt: now,
    updatedAt: now,
    auditTrail: [
      ...session.auditTrail,
      {
        timestamp: now,
        action: 'supervisor_approved',
        userId: supervisorId,
        details: 'Data entry approved by supervisor',
      },
    ],
  };
}

/**
 * Get fields needing attention in a session
 */
export function getFieldsNeedingAttention(
  session: DataEntrySession
): FieldEntryStatus[] {
  return Object.values(session.fieldStatus).filter(
    (field) => field.status === 'pending' || field.status === 'rejected'
  );
}

/**
 * Get session statistics
 */
export function getSessionStatistics(session: DataEntrySession): {
  totalFields: number;
  autoAccepted: number;
  manuallyAccepted: number;
  overridden: number;
  rejected: number;
  pending: number;
  completionPercentage: number;
  timeSpentSeconds: number;
  averageTimePerField: number;
} {
  const statuses = Object.values(session.fieldStatus);

  const autoAccepted = statuses.filter(
    (f) => f.status === 'auto_accepted'
  ).length;
  const manuallyAccepted = statuses.filter(
    (f) => f.status === 'manually_accepted'
  ).length;
  const overridden = statuses.filter(
    (f) => f.status === 'manually_overridden'
  ).length;
  const rejected = statuses.filter((f) => f.status === 'rejected').length;
  const pending = statuses.filter((f) => f.status === 'pending').length;

  const acceptedCount = autoAccepted + manuallyAccepted + overridden;
  const timeSpentSeconds = Math.round(session.timeSpentMs / 1000);

  return {
    totalFields: statuses.length,
    autoAccepted,
    manuallyAccepted,
    overridden,
    rejected,
    pending,
    completionPercentage: session.completionPercentage,
    timeSpentSeconds,
    averageTimePerField:
      acceptedCount > 0
        ? Math.round(timeSpentSeconds / acceptedCount)
        : 0,
  };
}

/**
 * Extract final values from session
 */
export function extractFinalValues(
  session: DataEntrySession
): Record<AIExtractionField, string> {
  const result: Record<AIExtractionField, string> = {} as Record<
    AIExtractionField,
    string
  >;

  for (const [fieldName, fieldStatus] of Object.entries(session.fieldStatus)) {
    result[fieldName as AIExtractionField] = fieldStatus.finalValue;
  }

  return result;
}

/**
 * Calculate AI accuracy from session
 */
export function calculateAIAccuracy(session: DataEntrySession): {
  totalWithAI: number;
  aiCorrect: number;
  aiIncorrect: number;
  accuracyPercentage: number;
} {
  const fieldsWithAI = Object.values(session.fieldStatus).filter(
    (f) => f.aiValue !== undefined
  );

  const aiCorrect = fieldsWithAI.filter(
    (f) =>
      f.status === 'auto_accepted' ||
      (f.status === 'manually_accepted' && f.finalValue === f.aiValue)
  ).length;

  const aiIncorrect = fieldsWithAI.length - aiCorrect;

  return {
    totalWithAI: fieldsWithAI.length,
    aiCorrect,
    aiIncorrect,
    accuracyPercentage:
      fieldsWithAI.length > 0
        ? Math.round((aiCorrect / fieldsWithAI.length) * 100)
        : 0,
  };
}
