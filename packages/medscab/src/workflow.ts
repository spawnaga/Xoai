/**
 * Workflow & Queue Management Module
 *
 * Handles prescription workflow states, queue management,
 * and patient notifications.
 */

import { z } from 'zod';

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowState =
  | 'intake' // Just received (e-Rx, fax, phone, walk-in)
  | 'data_entry' // Being entered/verified by technician
  | 'insurance_pending' // Awaiting insurance adjudication
  | 'insurance_rejected' // Insurance rejected, needs resolution
  | 'dur_review' // DUR alerts need pharmacist review
  | 'prior_auth_pending' // Prior authorization submitted
  | 'filling' // Being filled by technician
  | 'verification' // Awaiting pharmacist verification
  | 'ready' // Ready for pickup/delivery
  | 'sold' // Picked up by patient
  | 'delivered' // Delivered to patient
  | 'returned_to_stock' // Returned to stock (not picked up)
  | 'transferred' // Transferred to another pharmacy
  | 'cancelled' // Cancelled
  | 'on_hold'; // On hold (various reasons)

export type WorkflowPriority = 'stat' | 'urgent' | 'normal' | 'low';

export interface WorkflowItem {
  id: string;
  prescriptionId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  drugName: string;
  strength: string;
  quantity: number;
  state: WorkflowState;
  priority: WorkflowPriority;
  promiseTime?: Date;
  assignedTo?: string;
  insuranceStatus?: InsuranceQueueStatus;
  durAlertCount?: number;
  isControlled: boolean;
  isRefrigerated: boolean;
  requiresCounseling: boolean;
  notes?: string;
  holdReason?: string;
  createdAt: Date;
  updatedAt: Date;
  stateHistory: WorkflowStateChange[];
}

export interface WorkflowStateChange {
  fromState: WorkflowState | null;
  toState: WorkflowState;
  changedBy: string;
  changedAt: Date;
  reason?: string;
  notes?: string;
}

export type InsuranceQueueStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'appealing';

// ============================================
// QUEUE MANAGEMENT
// ============================================

export interface QueueSummary {
  intake: number;
  dataEntry: number;
  insurancePending: number;
  insuranceRejected: number;
  durReview: number;
  priorAuthPending: number;
  filling: number;
  verification: number;
  ready: number;
  onHold: number;
  total: number;
  statCount: number;
  urgentCount: number;
  overdueCount: number;
}

/**
 * Calculate queue summary from workflow items
 */
export function calculateQueueSummary(items: WorkflowItem[]): QueueSummary {
  const now = new Date();

  const summary: QueueSummary = {
    intake: 0,
    dataEntry: 0,
    insurancePending: 0,
    insuranceRejected: 0,
    durReview: 0,
    priorAuthPending: 0,
    filling: 0,
    verification: 0,
    ready: 0,
    onHold: 0,
    total: items.length,
    statCount: 0,
    urgentCount: 0,
    overdueCount: 0,
  };

  for (const item of items) {
    // Count by state
    switch (item.state) {
      case 'intake': summary.intake++; break;
      case 'data_entry': summary.dataEntry++; break;
      case 'insurance_pending': summary.insurancePending++; break;
      case 'insurance_rejected': summary.insuranceRejected++; break;
      case 'dur_review': summary.durReview++; break;
      case 'prior_auth_pending': summary.priorAuthPending++; break;
      case 'filling': summary.filling++; break;
      case 'verification': summary.verification++; break;
      case 'ready': summary.ready++; break;
      case 'on_hold': summary.onHold++; break;
    }

    // Count by priority
    if (item.priority === 'stat') summary.statCount++;
    if (item.priority === 'urgent') summary.urgentCount++;

    // Check if overdue
    if (item.promiseTime && item.promiseTime < now && item.state !== 'sold' && item.state !== 'delivered') {
      summary.overdueCount++;
    }
  }

  return summary;
}

/**
 * Get queue color based on wait time thresholds
 */
export function getQueueColor(
  item: WorkflowItem,
  thresholds: QueueThresholds = DEFAULT_THRESHOLDS
): 'green' | 'yellow' | 'red' {
  if (!item.promiseTime) return 'green';

  const now = new Date();
  const minutesUntilDue = (item.promiseTime.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilDue < 0) return 'red'; // Overdue
  if (minutesUntilDue <= thresholds.yellow) return 'yellow'; // Warning
  return 'green'; // On track
}

export interface QueueThresholds {
  yellow: number; // Minutes until due to show yellow
  red: number; // Minutes until due to show red (usually 0 = overdue)
}

export const DEFAULT_THRESHOLDS: QueueThresholds = {
  yellow: 15,
  red: 0,
};

/**
 * Sort workflow items by priority and promise time
 */
export function sortWorkflowItems(items: WorkflowItem[]): WorkflowItem[] {
  const priorityOrder: Record<WorkflowPriority, number> = {
    stat: 0,
    urgent: 1,
    normal: 2,
    low: 3,
  };

  return [...items].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by promise time (earliest first)
    if (a.promiseTime && b.promiseTime) {
      return a.promiseTime.getTime() - b.promiseTime.getTime();
    }
    if (a.promiseTime) return -1;
    if (b.promiseTime) return 1;

    // Finally by creation time
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Filter workflow items by state
 */
export function filterByState(items: WorkflowItem[], states: WorkflowState[]): WorkflowItem[] {
  return items.filter(item => states.includes(item.state));
}

/**
 * Get items assigned to a specific user
 */
export function filterByAssignee(items: WorkflowItem[], userId: string): WorkflowItem[] {
  return items.filter(item => item.assignedTo === userId);
}

/**
 * Calculate wait time statistics
 */
export function calculateWaitTimeStats(items: WorkflowItem[]): WaitTimeStats {
  const waitTimes: number[] = [];
  const now = new Date();

  for (const item of items) {
    const waitTimeMinutes = (now.getTime() - item.createdAt.getTime()) / (1000 * 60);
    waitTimes.push(waitTimeMinutes);
  }

  if (waitTimes.length === 0) {
    return { average: 0, median: 0, max: 0, min: 0, count: 0 };
  }

  const sorted = [...waitTimes].sort((a, b) => a - b);
  const sum = waitTimes.reduce((a, b) => a + b, 0);

  return {
    average: Math.round(sum / waitTimes.length),
    median: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0),
    max: Math.round(Math.max(...waitTimes)),
    min: Math.round(Math.min(...waitTimes)),
    count: waitTimes.length,
  };
}

export interface WaitTimeStats {
  average: number;
  median: number;
  max: number;
  min: number;
  count: number;
}

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Define valid state transitions
 */
export const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  intake: ['data_entry', 'cancelled', 'on_hold'],
  data_entry: ['insurance_pending', 'filling', 'dur_review', 'cancelled', 'on_hold'],
  insurance_pending: ['data_entry', 'insurance_rejected', 'filling', 'dur_review', 'prior_auth_pending', 'cancelled', 'on_hold'],
  insurance_rejected: ['data_entry', 'insurance_pending', 'prior_auth_pending', 'cancelled', 'on_hold'],
  dur_review: ['filling', 'cancelled', 'on_hold'],
  prior_auth_pending: ['insurance_pending', 'filling', 'cancelled', 'on_hold'],
  filling: ['verification', 'cancelled', 'on_hold'],
  verification: ['ready', 'filling', 'cancelled', 'on_hold'],
  ready: ['sold', 'delivered', 'returned_to_stock', 'transferred', 'on_hold'],
  sold: [], // Terminal state
  delivered: [], // Terminal state
  returned_to_stock: [], // Terminal state
  transferred: [], // Terminal state
  cancelled: [], // Terminal state
  on_hold: ['intake', 'data_entry', 'insurance_pending', 'filling', 'verification', 'ready', 'cancelled'],
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: WorkflowState, to: WorkflowState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Transition a workflow item to a new state
 */
export function transitionState(
  item: WorkflowItem,
  toState: WorkflowState,
  userId: string,
  reason?: string,
  notes?: string
): TransitionResult {
  if (!isValidTransition(item.state, toState)) {
    return {
      success: false,
      error: `Invalid transition from ${item.state} to ${toState}`,
      item,
    };
  }

  const stateChange: WorkflowStateChange = {
    fromState: item.state,
    toState,
    changedBy: userId,
    changedAt: new Date(),
    reason,
    notes,
  };

  const updatedItem: WorkflowItem = {
    ...item,
    state: toState,
    updatedAt: new Date(),
    stateHistory: [...item.stateHistory, stateChange],
    holdReason: toState === 'on_hold' ? reason : undefined,
  };

  return {
    success: true,
    item: updatedItem,
    stateChange,
  };
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  item: WorkflowItem;
  stateChange?: WorkflowStateChange;
}

// ============================================
// PATIENT NOTIFICATIONS
// ============================================

export type NotificationType =
  | 'rx_received' // Prescription received
  | 'rx_ready' // Ready for pickup
  | 'rx_delivered' // Delivered
  | 'refill_reminder' // Refill reminder
  | 'refill_due' // Refill is due
  | 'pickup_reminder' // Hasn't picked up
  | 'expiring_soon' // Prescription expiring
  | 'expired' // Prescription expired
  | 'insurance_issue' // Insurance problem
  | 'prior_auth_approved' // PA approved
  | 'prior_auth_denied' // PA denied
  | 'auto_refill_processed' // Auto-refill submitted
  | 'delivery_scheduled'; // Delivery scheduled

export type NotificationChannel = 'sms' | 'email' | 'phone' | 'app_push';

export interface PatientNotification {
  id: string;
  patientId: string;
  prescriptionId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opted_out';
  message: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  createdAt: Date;
}

export interface NotificationPreferences {
  patientId: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  phoneEnabled: boolean;
  appPushEnabled: boolean;
  preferredChannel: NotificationChannel;
  phoneNumber?: string;
  email?: string;
  optedOutTypes: NotificationType[];
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string; // e.g., "08:00"
}

/**
 * Generate notification message based on type
 */
export function generateNotificationMessage(
  type: NotificationType,
  data: NotificationData
): string {
  const templates: Record<NotificationType, (data: NotificationData) => string> = {
    rx_received: (d) => `${d.pharmacyName}: We received your prescription for ${d.drugName}. We'll notify you when it's ready.`,
    rx_ready: (d) => `${d.pharmacyName}: Your prescription for ${d.drugName} is ready for pickup.${d.pickupHours ? ` Hours: ${d.pickupHours}` : ''}`,
    rx_delivered: (d) => `${d.pharmacyName}: Your prescription for ${d.drugName} has been delivered.`,
    refill_reminder: (d) => `${d.pharmacyName}: Time to refill your ${d.drugName}. Reply YES to refill or call us.`,
    refill_due: (d) => `${d.pharmacyName}: Your ${d.drugName} is due for refill. ${d.refillsRemaining} refills remaining.`,
    pickup_reminder: (d) => `${d.pharmacyName}: Reminder - Your prescription for ${d.drugName} is ready. Please pick up within ${d.daysUntilReturn || 7} days.`,
    expiring_soon: (d) => `${d.pharmacyName}: Your prescription for ${d.drugName} expires on ${d.expirationDate}. Call us to renew.`,
    expired: (d) => `${d.pharmacyName}: Your prescription for ${d.drugName} has expired. Contact your doctor for a new prescription.`,
    insurance_issue: (d) => `${d.pharmacyName}: There's an insurance issue with your ${d.drugName}. Please call us at ${d.pharmacyPhone}.`,
    prior_auth_approved: (d) => `${d.pharmacyName}: Good news! Prior authorization approved for ${d.drugName}. Your prescription is being processed.`,
    prior_auth_denied: (d) => `${d.pharmacyName}: Prior authorization for ${d.drugName} was denied. Please call us to discuss options.`,
    auto_refill_processed: (d) => `${d.pharmacyName}: Your auto-refill for ${d.drugName} has been processed. Ready ${d.readyDate || 'soon'}.`,
    delivery_scheduled: (d) => `${d.pharmacyName}: Your delivery for ${d.drugName} is scheduled for ${d.deliveryDate}.${d.trackingNumber ? ` Tracking: ${d.trackingNumber}` : ''}`,
  };

  return templates[type](data);
}

export interface NotificationData {
  pharmacyName: string;
  pharmacyPhone?: string;
  drugName: string;
  patientName?: string;
  rxNumber?: string;
  refillsRemaining?: number;
  pickupHours?: string;
  expirationDate?: string;
  readyDate?: string;
  deliveryDate?: string;
  trackingNumber?: string;
  daysUntilReturn?: number;
}

/**
 * Check if notification should be sent based on preferences
 */
export function shouldSendNotification(
  prefs: NotificationPreferences,
  type: NotificationType,
  channel: NotificationChannel,
  currentTime: Date = new Date()
): NotificationCheck {
  // Check if opted out of this type
  if (prefs.optedOutTypes.includes(type)) {
    return { shouldSend: false, reason: 'Patient opted out of this notification type' };
  }

  // Check channel availability
  switch (channel) {
    case 'sms':
      if (!prefs.smsEnabled || !prefs.phoneNumber) {
        return { shouldSend: false, reason: 'SMS not enabled or phone number not available' };
      }
      break;
    case 'email':
      if (!prefs.emailEnabled || !prefs.email) {
        return { shouldSend: false, reason: 'Email not enabled or email address not available' };
      }
      break;
    case 'phone':
      if (!prefs.phoneEnabled || !prefs.phoneNumber) {
        return { shouldSend: false, reason: 'Phone calls not enabled or phone number not available' };
      }
      break;
    case 'app_push':
      if (!prefs.appPushEnabled) {
        return { shouldSend: false, reason: 'App push notifications not enabled' };
      }
      break;
  }

  // Check quiet hours
  if (prefs.quietHoursStart && prefs.quietHoursEnd) {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    if (isInQuietHours(currentTimeStr, prefs.quietHoursStart, prefs.quietHoursEnd)) {
      return { shouldSend: false, reason: 'Currently in quiet hours', scheduleFor: getNextNonQuietTime(prefs.quietHoursEnd) };
    }
  }

  return { shouldSend: true };
}

export interface NotificationCheck {
  shouldSend: boolean;
  reason?: string;
  scheduleFor?: Date;
}

function isInQuietHours(current: string, start: string, end: string): boolean {
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return current >= start || current < end;
  }
  return current >= start && current < end;
}

function getNextNonQuietTime(quietEnd: string): Date {
  const [hours, minutes] = quietEnd.split(':').map(Number);
  const next = new Date();
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  // If quiet hours end time has passed today, schedule for tomorrow
  if (next <= new Date()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

// ============================================
// WILL-CALL BIN MANAGEMENT
// ============================================

export interface WillCallBin {
  binId: string;
  binLocation: string; // e.g., "A-12", "REF-3" for refrigerator
  prescriptionId: string;
  rxNumber: string;
  patientName: string;
  drugName: string;
  quantity: number;
  placedAt: Date;
  promiseTime?: Date;
  isRefrigerated: boolean;
  isControlled: boolean;
  daysInBin: number;
  returnToStockDate: Date;
}

/**
 * Calculate days until return to stock
 */
export function calculateReturnDate(
  placedAt: Date,
  returnDays: number = 10
): { returnDate: Date; daysRemaining: number; isOverdue: boolean } {
  const returnDate = new Date(placedAt);
  returnDate.setDate(returnDate.getDate() + returnDays);

  const today = new Date();
  const daysRemaining = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    returnDate,
    daysRemaining: Math.max(0, daysRemaining),
    isOverdue: daysRemaining < 0,
  };
}

/**
 * Get prescriptions ready for return to stock
 */
export function getReadyForReturn(bins: WillCallBin[]): WillCallBin[] {
  const today = new Date();
  return bins.filter(bin => bin.returnToStockDate <= today);
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const WorkflowItemSchema = z.object({
  prescriptionId: z.string().uuid(),
  rxNumber: z.string(),
  patientId: z.string().uuid(),
  patientName: z.string(),
  drugName: z.string(),
  strength: z.string(),
  quantity: z.number().positive(),
  state: z.enum([
    'intake', 'data_entry', 'insurance_pending', 'insurance_rejected',
    'dur_review', 'prior_auth_pending', 'filling', 'verification',
    'ready', 'sold', 'delivered', 'returned_to_stock', 'transferred',
    'cancelled', 'on_hold',
  ]),
  priority: z.enum(['stat', 'urgent', 'normal', 'low']),
  promiseTime: z.date().optional(),
  assignedTo: z.string().optional(),
  isControlled: z.boolean(),
  isRefrigerated: z.boolean(),
  requiresCounseling: z.boolean(),
  notes: z.string().optional(),
  holdReason: z.string().optional(),
});

export const NotificationPreferencesSchema = z.object({
  patientId: z.string().uuid(),
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  phoneEnabled: z.boolean(),
  appPushEnabled: z.boolean(),
  preferredChannel: z.enum(['sms', 'email', 'phone', 'app_push']),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  optedOutTypes: z.array(z.string()),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});
