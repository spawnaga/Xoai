/**
 * Prescriber Communication Module
 *
 * Handles communication with prescribers:
 * - Fill notifications
 * - Hold/cancel notifications
 * - Renewal requests
 * - Prior authorization requests
 * - Clarification requests
 * - Therapy change suggestions
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Communication message types
 */
export type PrescriberMessageType =
  | 'fill_notification'
  | 'hold_notification'
  | 'cancel_request'
  | 'renewal_request'
  | 'prior_auth_request'
  | 'clarification_request'
  | 'therapy_change'
  | 'generic_substitution'
  | 'drug_interaction'
  | 'formulary_alternative'
  | 'refill_too_soon'
  | 'quantity_clarification'
  | 'directions_clarification'
  | 'daw_clarification'
  | 'general_inquiry';

/**
 * Communication channel
 */
export type CommunicationChannel =
  | 'surescripts' // eRx network
  | 'fax'
  | 'phone'
  | 'portal' // EHR portal
  | 'secure_message'
  | 'mail';

/**
 * Message status
 */
export type MessageStatus =
  | 'draft'
  | 'pending_send'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'response_received'
  | 'response_pending'
  | 'expired'
  | 'cancelled'
  | 'failed';

/**
 * Response type
 */
export type ResponseType =
  | 'approved'
  | 'denied'
  | 'modified'
  | 'pending'
  | 'more_info_needed'
  | 'call_prescriber'
  | 'no_response';

/**
 * Priority level
 */
export type MessagePriority = 'routine' | 'urgent' | 'stat';

/**
 * Prescriber information
 */
export interface PrescriberContact {
  npi: string;
  dea?: string;
  firstName: string;
  lastName: string;
  credential?: string;
  specialty?: string;
  phone: string;
  fax?: string;
  email?: string;
  preferredContact?: CommunicationChannel;
  surescriptsEnabled?: boolean;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  };
}

/**
 * Pharmacy information for communication
 */
export interface PharmacyContact {
  name: string;
  npi: string;
  dea: string;
  ncpdpId: string;
  phone: string;
  fax: string;
  email?: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  };
  pharmacistName?: string;
  pharmacistLicense?: string;
}

/**
 * Prescription reference
 */
export interface PrescriptionReference {
  prescriptionId: string;
  rxNumber: string;
  drugName: string;
  strength: string;
  quantity: number;
  daysSupply: number;
  sig: string;
  refillsAuthorized?: number;
  refillsRemaining?: number;
  writtenDate?: Date;
  deaSchedule?: string;
}

/**
 * Patient reference
 */
export interface PatientReference {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone?: string;
  mrn?: string;
}

/**
 * Prescriber message
 */
export interface PrescriberMessage {
  id: string;
  messageType: PrescriberMessageType;
  priority: MessagePriority;

  // Contacts
  prescriber: PrescriberContact;
  pharmacy: PharmacyContact;

  // References
  prescription: PrescriptionReference;
  patient: PatientReference;

  // Communication
  channel: CommunicationChannel;
  subject: string;
  body: string;
  attachments?: string[];

  // Surescripts fields (if applicable)
  surescriptsMessageId?: string;
  surescriptsMessageType?: string;
  surescriptsRelatesTo?: string;

  // Timing
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  responseDeadline?: Date;
  expiredAt?: Date;

  // Sender
  sentBy: string;
  sentByName?: string;

  // Response tracking
  status: MessageStatus;
  responseReceived: boolean;
  responseAt?: Date;
  responseType?: ResponseType;
  responseNotes?: string;
  responseBy?: string;

  // Follow-up
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpNotes?: string;

  // Error handling
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;

  // Audit
  auditTrail: MessageAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message audit entry
 */
export interface MessageAuditEntry {
  timestamp: Date;
  action: string;
  userId?: string;
  details?: string;
  previousStatus?: MessageStatus;
  newStatus?: MessageStatus;
}

/**
 * Renewal request details
 */
export interface RenewalRequest {
  messageId: string;
  prescriptionId: string;
  originalRxNumber: string;
  drugName: string;
  strength: string;
  quantity: number;
  daysSupply: number;
  sig: string;
  lastFillDate?: Date;
  refillsRemaining: number;
  requestedRefills: number;
  requestReason?: string;
  patientNotes?: string;
}

/**
 * Prior authorization request details
 */
export interface PriorAuthRequest {
  messageId: string;
  prescriptionId: string;
  insuranceName: string;
  insurancePhone?: string;
  paNumber?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  alternativeSuggested?: string;
  clinicalJustificationRequired: boolean;
  diagnosisRequired: boolean;
  documentation?: string[];
}

/**
 * Clarification request details
 */
export interface ClarificationRequest {
  messageId: string;
  prescriptionId: string;
  clarificationType: 'quantity' | 'directions' | 'strength' | 'drug' | 'daw' | 'refills' | 'other';
  originalValue?: string;
  suggestedValue?: string;
  question: string;
  options?: string[];
}

/**
 * Therapy change request details
 */
export interface TherapyChangeRequest {
  messageId: string;
  prescriptionId: string;
  currentDrug: string;
  currentStrength: string;
  suggestedDrug: string;
  suggestedStrength: string;
  changeReason: 'formulary' | 'cost' | 'clinical' | 'shortage' | 'allergy' | 'interaction';
  changeJustification: string;
  costSavings?: number;
  clinicalNotes?: string;
}

/**
 * Message template
 */
export interface MessageTemplate {
  id: string;
  name: string;
  messageType: PrescriberMessageType;
  subject: string;
  body: string;
  variables: string[];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

/**
 * Communication statistics
 */
export interface CommunicationStats {
  totalSent: number;
  byType: Record<PrescriberMessageType, number>;
  byChannel: Record<CommunicationChannel, number>;
  byStatus: Record<MessageStatus, number>;
  responseRate: number;
  averageResponseTimeHours: number;
  pendingResponses: number;
  expiredCount: number;
}

// ============================================
// SCHEMAS
// ============================================

export const PrescriberContactSchema = z.object({
  npi: z.string().length(10),
  dea: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  credential: z.string().optional(),
  specialty: z.string().optional(),
  phone: z.string(),
  fax: z.string().optional(),
  email: z.string().email().optional(),
  preferredContact: z
    .enum(['surescripts', 'fax', 'phone', 'portal', 'secure_message', 'mail'])
    .optional(),
  surescriptsEnabled: z.boolean().optional(),
  address: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string().length(2),
      zip: z.string(),
    })
    .optional(),
});

export const PharmacyContactSchema = z.object({
  name: z.string().min(1),
  npi: z.string().length(10),
  dea: z.string().length(9),
  ncpdpId: z.string(),
  phone: z.string(),
  fax: z.string(),
  email: z.string().email().optional(),
  address: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
  }),
  pharmacistName: z.string().optional(),
  pharmacistLicense: z.string().optional(),
});

export const PrescriberMessageSchema = z.object({
  id: z.string(),
  messageType: z.enum([
    'fill_notification',
    'hold_notification',
    'cancel_request',
    'renewal_request',
    'prior_auth_request',
    'clarification_request',
    'therapy_change',
    'generic_substitution',
    'drug_interaction',
    'formulary_alternative',
    'refill_too_soon',
    'quantity_clarification',
    'directions_clarification',
    'daw_clarification',
    'general_inquiry',
  ]),
  priority: z.enum(['routine', 'urgent', 'stat']),
  channel: z.enum(['surescripts', 'fax', 'phone', 'portal', 'secure_message', 'mail']),
  subject: z.string(),
  body: z.string(),
  status: z.enum([
    'draft',
    'pending_send',
    'sent',
    'delivered',
    'read',
    'response_received',
    'response_pending',
    'expired',
    'cancelled',
    'failed',
  ]),
  responseReceived: z.boolean(),
  followUpRequired: z.boolean(),
  retryCount: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Message type display names
 */
export const MESSAGE_TYPE_NAMES: Record<PrescriberMessageType, string> = {
  fill_notification: 'Fill Notification',
  hold_notification: 'On Hold Notification',
  cancel_request: 'Cancellation Request',
  renewal_request: 'Renewal/Refill Request',
  prior_auth_request: 'Prior Authorization Request',
  clarification_request: 'Clarification Request',
  therapy_change: 'Therapy Change Request',
  generic_substitution: 'Generic Substitution Notification',
  drug_interaction: 'Drug Interaction Alert',
  formulary_alternative: 'Formulary Alternative Request',
  refill_too_soon: 'Refill Too Soon Alert',
  quantity_clarification: 'Quantity Clarification',
  directions_clarification: 'Directions Clarification',
  daw_clarification: 'DAW Code Clarification',
  general_inquiry: 'General Inquiry',
};

/**
 * Channel display names
 */
export const CHANNEL_NAMES: Record<CommunicationChannel, string> = {
  surescripts: 'Surescripts eRx',
  fax: 'Fax',
  phone: 'Phone',
  portal: 'EHR Portal',
  secure_message: 'Secure Message',
  mail: 'Mail',
};

/**
 * Status display names
 */
export const STATUS_NAMES: Record<MessageStatus, string> = {
  draft: 'Draft',
  pending_send: 'Pending Send',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  response_received: 'Response Received',
  response_pending: 'Awaiting Response',
  expired: 'Expired',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

/**
 * Response type display names
 */
export const RESPONSE_TYPE_NAMES: Record<ResponseType, string> = {
  approved: 'Approved',
  denied: 'Denied',
  modified: 'Approved with Modifications',
  pending: 'Pending Review',
  more_info_needed: 'More Information Needed',
  call_prescriber: 'Call Prescriber',
  no_response: 'No Response',
};

/**
 * Default response deadlines (hours)
 */
export const DEFAULT_RESPONSE_DEADLINES: Record<PrescriberMessageType, number> = {
  fill_notification: 0, // No response expected
  hold_notification: 24,
  cancel_request: 48,
  renewal_request: 72,
  prior_auth_request: 72,
  clarification_request: 24,
  therapy_change: 48,
  generic_substitution: 24,
  drug_interaction: 4,
  formulary_alternative: 48,
  refill_too_soon: 24,
  quantity_clarification: 24,
  directions_clarification: 24,
  daw_clarification: 24,
  general_inquiry: 48,
};

/**
 * Maximum retry attempts
 */
export const MAX_RETRY_ATTEMPTS = 3;

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate message ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `MSG-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create a new prescriber message
 */
export function createMessage(
  messageType: PrescriberMessageType,
  prescriber: PrescriberContact,
  pharmacy: PharmacyContact,
  prescription: PrescriptionReference,
  patient: PatientReference,
  channel: CommunicationChannel,
  subject: string,
  body: string,
  sentBy: string,
  options?: {
    priority?: MessagePriority;
    responseDeadlineHours?: number;
    attachments?: string[];
    surescriptsMessageType?: string;
    sentByName?: string;
  }
): PrescriberMessage {
  const now = new Date();

  // Calculate response deadline
  const deadlineHours =
    options?.responseDeadlineHours ?? DEFAULT_RESPONSE_DEADLINES[messageType];
  let responseDeadline: Date | undefined;
  if (deadlineHours > 0) {
    responseDeadline = new Date(now);
    responseDeadline.setHours(responseDeadline.getHours() + deadlineHours);
  }

  return {
    id: generateMessageId(),
    messageType,
    priority: options?.priority || 'routine',
    prescriber,
    pharmacy,
    prescription,
    patient,
    channel,
    subject,
    body,
    attachments: options?.attachments,
    surescriptsMessageType: options?.surescriptsMessageType,
    responseDeadline,
    sentBy,
    sentByName: options?.sentByName,
    status: 'draft',
    responseReceived: false,
    followUpRequired: deadlineHours > 0,
    retryCount: 0,
    auditTrail: [
      {
        timestamp: now,
        action: 'created',
        userId: sentBy,
        details: `${MESSAGE_TYPE_NAMES[messageType]} message created`,
        newStatus: 'draft',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update message status
 */
export function updateMessageStatus(
  message: PrescriberMessage,
  newStatus: MessageStatus,
  userId?: string,
  details?: string
): PrescriberMessage {
  const now = new Date();
  const previousStatus = message.status;

  return {
    ...message,
    status: newStatus,
    updatedAt: now,
    auditTrail: [
      ...message.auditTrail,
      {
        timestamp: now,
        action: 'status_change',
        userId,
        details,
        previousStatus,
        newStatus,
      },
    ],
  };
}

/**
 * Mark message as sent
 */
export function markMessageSent(
  message: PrescriberMessage,
  surescriptsMessageId?: string
): PrescriberMessage {
  const now = new Date();

  return {
    ...updateMessageStatus(message, 'sent', undefined, 'Message sent'),
    sentAt: now,
    surescriptsMessageId,
  };
}

/**
 * Mark message as delivered
 */
export function markMessageDelivered(message: PrescriberMessage): PrescriberMessage {
  return {
    ...updateMessageStatus(message, 'delivered', undefined, 'Message delivered'),
    deliveredAt: new Date(),
  };
}

/**
 * Mark message as read
 */
export function markMessageRead(message: PrescriberMessage): PrescriberMessage {
  return {
    ...updateMessageStatus(message, 'read', undefined, 'Message read by prescriber'),
    readAt: new Date(),
  };
}

/**
 * Record response
 */
export function recordResponse(
  message: PrescriberMessage,
  responseType: ResponseType,
  responseNotes: string,
  responseBy: string
): PrescriberMessage {
  const now = new Date();

  return {
    ...updateMessageStatus(
      message,
      'response_received',
      responseBy,
      `Response: ${RESPONSE_TYPE_NAMES[responseType]}`
    ),
    responseReceived: true,
    responseAt: now,
    responseType,
    responseNotes,
    responseBy,
    followUpRequired:
      responseType === 'more_info_needed' || responseType === 'call_prescriber',
  };
}

/**
 * Mark message as failed
 */
export function markMessageFailed(
  message: PrescriberMessage,
  errorMessage: string
): PrescriberMessage {
  return {
    ...updateMessageStatus(message, 'failed', undefined, errorMessage),
    errorMessage,
  };
}

/**
 * Mark for retry
 */
export function markForRetry(message: PrescriberMessage): PrescriberMessage {
  if (message.retryCount >= MAX_RETRY_ATTEMPTS) {
    return markMessageFailed(message, 'Maximum retry attempts exceeded');
  }

  const now = new Date();

  return {
    ...updateMessageStatus(message, 'pending_send', undefined, 'Marked for retry'),
    retryCount: message.retryCount + 1,
    lastRetryAt: now,
  };
}

/**
 * Cancel message
 */
export function cancelMessage(
  message: PrescriberMessage,
  userId: string,
  reason: string
): PrescriberMessage {
  return updateMessageStatus(message, 'cancelled', userId, reason);
}

/**
 * Check if message is expired
 */
export function isMessageExpired(message: PrescriberMessage): boolean {
  if (!message.responseDeadline) return false;
  return new Date() > message.responseDeadline;
}

/**
 * Mark expired messages
 */
export function checkAndMarkExpired(message: PrescriberMessage): PrescriberMessage {
  if (
    message.status !== 'sent' &&
    message.status !== 'delivered' &&
    message.status !== 'read' &&
    message.status !== 'response_pending'
  ) {
    return message;
  }

  if (!isMessageExpired(message)) {
    return message;
  }

  return {
    ...updateMessageStatus(message, 'expired', undefined, 'Response deadline passed'),
    expiredAt: new Date(),
  };
}

/**
 * Generate fill notification message
 */
export function generateFillNotification(
  prescription: PrescriptionReference,
  patient: PatientReference,
  pharmacy: PharmacyContact
): { subject: string; body: string } {
  const subject = `Prescription Filled: ${prescription.drugName} for ${patient.lastName}, ${patient.firstName}`;

  const body = `
Dear Prescriber,

This is to notify you that the following prescription has been filled:

PATIENT INFORMATION
Name: ${patient.lastName}, ${patient.firstName}
DOB: ${patient.dateOfBirth.toLocaleDateString()}

PRESCRIPTION DETAILS
Rx Number: ${prescription.rxNumber}
Medication: ${prescription.drugName} ${prescription.strength}
Quantity: ${prescription.quantity}
Days Supply: ${prescription.daysSupply}
Directions: ${prescription.sig}

PHARMACY INFORMATION
${pharmacy.name}
${pharmacy.address.street1}
${pharmacy.address.city}, ${pharmacy.address.state} ${pharmacy.address.zip}
Phone: ${pharmacy.phone}
Fax: ${pharmacy.fax}

This notification is for your records. No response is required.

Thank you,
${pharmacy.pharmacistName || 'Pharmacy Staff'}
${pharmacy.name}
`.trim();

  return { subject, body };
}

/**
 * Generate renewal request message
 */
export function generateRenewalRequest(
  prescription: PrescriptionReference,
  patient: PatientReference,
  pharmacy: PharmacyContact,
  requestedRefills: number,
  reason?: string
): { subject: string; body: string } {
  const subject = `Refill/Renewal Request: ${prescription.drugName} for ${patient.lastName}, ${patient.firstName}`;

  const body = `
Dear Prescriber,

We are requesting a prescription renewal for your patient:

PATIENT INFORMATION
Name: ${patient.lastName}, ${patient.firstName}
DOB: ${patient.dateOfBirth.toLocaleDateString()}
${patient.phone ? `Phone: ${patient.phone}` : ''}

ORIGINAL PRESCRIPTION
Rx Number: ${prescription.rxNumber}
Medication: ${prescription.drugName} ${prescription.strength}
Quantity: ${prescription.quantity}
Days Supply: ${prescription.daysSupply}
Directions: ${prescription.sig}
Refills Remaining: ${prescription.refillsRemaining || 0}

REQUEST
Refills Requested: ${requestedRefills}
${reason ? `Reason: ${reason}` : ''}

Please respond to this request by:
- Calling our pharmacy at ${pharmacy.phone}
- Faxing a new prescription to ${pharmacy.fax}
- Sending an electronic prescription

PHARMACY INFORMATION
${pharmacy.name}
${pharmacy.address.street1}
${pharmacy.address.city}, ${pharmacy.address.state} ${pharmacy.address.zip}
Phone: ${pharmacy.phone}
Fax: ${pharmacy.fax}

Thank you,
${pharmacy.pharmacistName || 'Pharmacy Staff'}
${pharmacy.name}
`.trim();

  return { subject, body };
}

/**
 * Generate prior auth request message
 */
export function generatePriorAuthRequest(
  prescription: PrescriptionReference,
  patient: PatientReference,
  pharmacy: PharmacyContact,
  insuranceName: string,
  rejectionReason?: string,
  alternativeSuggested?: string
): { subject: string; body: string } {
  const subject = `Prior Authorization Required: ${prescription.drugName} for ${patient.lastName}, ${patient.firstName}`;

  const body = `
Dear Prescriber,

A prescription for your patient requires prior authorization from the patient's insurance:

PATIENT INFORMATION
Name: ${patient.lastName}, ${patient.firstName}
DOB: ${patient.dateOfBirth.toLocaleDateString()}
Insurance: ${insuranceName}

PRESCRIPTION DETAILS
Rx Number: ${prescription.rxNumber}
Medication: ${prescription.drugName} ${prescription.strength}
Quantity: ${prescription.quantity}
Days Supply: ${prescription.daysSupply}
Directions: ${prescription.sig}

INSURANCE REJECTION
${rejectionReason ? `Reason: ${rejectionReason}` : 'Prior authorization required'}
${alternativeSuggested ? `\nAlternative Suggested by Insurance: ${alternativeSuggested}` : ''}

ACTION REQUIRED
Please submit a prior authorization to the patient's insurance plan, or consider one of these options:
1. Submit prior authorization documentation
2. Change therapy to a covered alternative
3. Provide clinical justification for continued use

Please contact our pharmacy if you need additional information to complete the prior authorization.

PHARMACY INFORMATION
${pharmacy.name}
${pharmacy.address.street1}
${pharmacy.address.city}, ${pharmacy.address.state} ${pharmacy.address.zip}
Phone: ${pharmacy.phone}
Fax: ${pharmacy.fax}

Thank you,
${pharmacy.pharmacistName || 'Pharmacy Staff'}
${pharmacy.name}
`.trim();

  return { subject, body };
}

/**
 * Generate clarification request message
 */
export function generateClarificationRequest(
  prescription: PrescriptionReference,
  patient: PatientReference,
  pharmacy: PharmacyContact,
  clarificationType: string,
  question: string,
  originalValue?: string,
  suggestedValue?: string
): { subject: string; body: string } {
  const subject = `Clarification Needed: ${prescription.drugName} for ${patient.lastName}, ${patient.firstName}`;

  const body = `
Dear Prescriber,

We need clarification on a prescription for your patient:

PATIENT INFORMATION
Name: ${patient.lastName}, ${patient.firstName}
DOB: ${patient.dateOfBirth.toLocaleDateString()}

PRESCRIPTION DETAILS
Rx Number: ${prescription.rxNumber}
Medication: ${prescription.drugName} ${prescription.strength}
Quantity: ${prescription.quantity}
Days Supply: ${prescription.daysSupply}
Directions: ${prescription.sig}

CLARIFICATION NEEDED
Type: ${clarificationType}
${originalValue ? `Current Value: ${originalValue}` : ''}
${suggestedValue ? `Suggested Value: ${suggestedValue}` : ''}

Question: ${question}

Please respond to this clarification request by:
- Calling our pharmacy at ${pharmacy.phone}
- Faxing your response to ${pharmacy.fax}
- Sending an updated prescription electronically

PHARMACY INFORMATION
${pharmacy.name}
${pharmacy.address.street1}
${pharmacy.address.city}, ${pharmacy.address.state} ${pharmacy.address.zip}
Phone: ${pharmacy.phone}
Fax: ${pharmacy.fax}

Thank you,
${pharmacy.pharmacistName || 'Pharmacy Staff'}
${pharmacy.name}
`.trim();

  return { subject, body };
}

/**
 * Generate therapy change request message
 */
export function generateTherapyChangeRequest(
  prescription: PrescriptionReference,
  patient: PatientReference,
  pharmacy: PharmacyContact,
  suggestedDrug: string,
  suggestedStrength: string,
  changeReason: string,
  justification: string,
  costSavings?: number
): { subject: string; body: string } {
  const subject = `Therapy Change Recommendation: ${prescription.drugName} to ${suggestedDrug} for ${patient.lastName}, ${patient.firstName}`;

  const body = `
Dear Prescriber,

We are recommending a therapy change for your patient:

PATIENT INFORMATION
Name: ${patient.lastName}, ${patient.firstName}
DOB: ${patient.dateOfBirth.toLocaleDateString()}

CURRENT PRESCRIPTION
Rx Number: ${prescription.rxNumber}
Medication: ${prescription.drugName} ${prescription.strength}
Quantity: ${prescription.quantity}
Days Supply: ${prescription.daysSupply}
Directions: ${prescription.sig}

RECOMMENDED CHANGE
Suggested Medication: ${suggestedDrug} ${suggestedStrength}
Reason: ${changeReason}
${costSavings ? `Estimated Cost Savings: $${costSavings.toFixed(2)}` : ''}

CLINICAL JUSTIFICATION
${justification}

Please indicate your preference by:
1. Approving the change (we will fill the recommended medication)
2. Denying the change (we will attempt to fill the original)
3. Providing an alternative recommendation

PHARMACY INFORMATION
${pharmacy.name}
${pharmacy.address.street1}
${pharmacy.address.city}, ${pharmacy.address.state} ${pharmacy.address.zip}
Phone: ${pharmacy.phone}
Fax: ${pharmacy.fax}

Thank you,
${pharmacy.pharmacistName || 'Pharmacy Staff'}
${pharmacy.name}
`.trim();

  return { subject, body };
}

/**
 * Get pending messages requiring follow-up
 */
export function getPendingFollowUps(messages: PrescriberMessage[]): PrescriberMessage[] {
  return messages.filter(
    (m) =>
      m.followUpRequired &&
      !m.responseReceived &&
      m.status !== 'cancelled' &&
      m.status !== 'expired'
  );
}

/**
 * Get expired messages
 */
export function getExpiredMessages(messages: PrescriberMessage[]): PrescriberMessage[] {
  return messages.filter((m) => isMessageExpired(m) && m.status !== 'expired');
}

/**
 * Calculate communication statistics
 */
export function calculateCommunicationStats(
  messages: PrescriberMessage[]
): CommunicationStats {
  const byType: Record<PrescriberMessageType, number> = {} as Record<
    PrescriberMessageType,
    number
  >;
  const byChannel: Record<CommunicationChannel, number> = {} as Record<
    CommunicationChannel,
    number
  >;
  const byStatus: Record<MessageStatus, number> = {} as Record<MessageStatus, number>;

  let responsesReceived = 0;
  let totalResponseTimeHours = 0;
  let pendingResponses = 0;
  let expiredCount = 0;

  // Initialize counters
  for (const type of Object.keys(MESSAGE_TYPE_NAMES) as PrescriberMessageType[]) {
    byType[type] = 0;
  }
  for (const channel of Object.keys(CHANNEL_NAMES) as CommunicationChannel[]) {
    byChannel[channel] = 0;
  }
  for (const status of Object.keys(STATUS_NAMES) as MessageStatus[]) {
    byStatus[status] = 0;
  }

  for (const message of messages) {
    byType[message.messageType]++;
    byChannel[message.channel]++;
    byStatus[message.status]++;

    if (message.responseReceived && message.sentAt && message.responseAt) {
      responsesReceived++;
      const responseTime =
        (message.responseAt.getTime() - message.sentAt.getTime()) / (1000 * 60 * 60);
      totalResponseTimeHours += responseTime;
    }

    if (
      message.status === 'sent' ||
      message.status === 'delivered' ||
      message.status === 'read' ||
      message.status === 'response_pending'
    ) {
      if (!message.responseReceived) {
        pendingResponses++;
      }
    }

    if (message.status === 'expired') {
      expiredCount++;
    }
  }

  const messagesExpectingResponse = messages.filter(
    (m) => DEFAULT_RESPONSE_DEADLINES[m.messageType] > 0
  ).length;

  return {
    totalSent: messages.filter((m) => m.sentAt).length,
    byType,
    byChannel,
    byStatus,
    responseRate:
      messagesExpectingResponse > 0
        ? Math.round((responsesReceived / messagesExpectingResponse) * 100)
        : 0,
    averageResponseTimeHours:
      responsesReceived > 0
        ? Math.round((totalResponseTimeHours / responsesReceived) * 10) / 10
        : 0,
    pendingResponses,
    expiredCount,
  };
}

/**
 * Format message for fax
 */
export function formatForFax(message: PrescriberMessage): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push(`PHARMACY COMMUNICATION - ${MESSAGE_TYPE_NAMES[message.messageType].toUpperCase()}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push(`Message ID: ${message.id}`);
  lines.push(`Priority: ${message.priority.toUpperCase()}`);
  lines.push('');
  lines.push('FROM: (Pharmacy)');
  lines.push('-'.repeat(30));
  lines.push(message.pharmacy.name);
  lines.push(`NPI: ${message.pharmacy.npi}`);
  lines.push(message.pharmacy.address.street1);
  lines.push(
    `${message.pharmacy.address.city}, ${message.pharmacy.address.state} ${message.pharmacy.address.zip}`
  );
  lines.push(`Phone: ${message.pharmacy.phone}`);
  lines.push(`Fax: ${message.pharmacy.fax}`);
  lines.push('');
  lines.push('TO: (Prescriber)');
  lines.push('-'.repeat(30));
  lines.push(`${message.prescriber.lastName}, ${message.prescriber.firstName} ${message.prescriber.credential || ''}`);
  lines.push(`NPI: ${message.prescriber.npi}`);
  if (message.prescriber.phone) lines.push(`Phone: ${message.prescriber.phone}`);
  if (message.prescriber.fax) lines.push(`Fax: ${message.prescriber.fax}`);
  lines.push('');
  lines.push('PATIENT:');
  lines.push('-'.repeat(30));
  lines.push(`${message.patient.lastName}, ${message.patient.firstName}`);
  lines.push(`DOB: ${message.patient.dateOfBirth.toLocaleDateString()}`);
  lines.push('');
  lines.push('SUBJECT:');
  lines.push('-'.repeat(30));
  lines.push(message.subject);
  lines.push('');
  lines.push('MESSAGE:');
  lines.push('-'.repeat(30));
  lines.push(message.body);
  lines.push('');
  if (message.responseDeadline) {
    lines.push(`Please respond by: ${message.responseDeadline.toLocaleString()}`);
  }
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('CONFIDENTIALITY NOTICE: This fax contains confidential');
  lines.push('patient health information protected under HIPAA.');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Get messages by prescriber
 */
export function getMessagesByPrescriber(
  messages: PrescriberMessage[],
  prescriberNpi: string
): PrescriberMessage[] {
  return messages.filter((m) => m.prescriber.npi === prescriberNpi);
}

/**
 * Get messages by patient
 */
export function getMessagesByPatient(
  messages: PrescriberMessage[],
  patientId: string
): PrescriberMessage[] {
  return messages.filter((m) => m.patient.patientId === patientId);
}

/**
 * Get messages requiring action
 */
export function getMessagesRequiringAction(
  messages: PrescriberMessage[]
): PrescriberMessage[] {
  return messages.filter(
    (m) =>
      m.status === 'response_pending' ||
      (m.responseType === 'more_info_needed' && !m.responseReceived) ||
      m.status === 'failed'
  );
}
