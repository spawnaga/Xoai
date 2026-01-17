/**
 * Prescription Workflow Module
 *
 * Central workflow orchestration for retail pharmacy dispensing.
 * Manages the prescription state machine: Intake → Data Entry → Claim → Fill → Verify → Dispense
 */

import { z } from 'zod';

// ============================================
// WORKFLOW STATE TYPES
// ============================================

/**
 * Prescription workflow states (matches Prisma enum)
 */
export type PrescriptionWorkflowState =
  | 'INTAKE'
  | 'DATA_ENTRY'
  | 'DATA_ENTRY_COMPLETE'
  | 'INSURANCE_PENDING'
  | 'INSURANCE_REJECTED'
  | 'DUR_REVIEW'
  | 'PRIOR_AUTH_PENDING'
  | 'PRIOR_AUTH_APPROVED'
  | 'FILLING'
  | 'VERIFICATION'
  | 'READY'
  | 'SOLD'
  | 'DELIVERED'
  | 'RETURNED_TO_STOCK'
  | 'CANCELLED';

export type WorkflowPriority = 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';

export const WORKFLOW_STATE_DISPLAY: Record<PrescriptionWorkflowState, string> = {
  INTAKE: 'Intake',
  DATA_ENTRY: 'Data Entry',
  DATA_ENTRY_COMPLETE: 'Data Entry Complete',
  INSURANCE_PENDING: 'Insurance Pending',
  INSURANCE_REJECTED: 'Insurance Rejected',
  DUR_REVIEW: 'DUR Review',
  PRIOR_AUTH_PENDING: 'Prior Auth Pending',
  PRIOR_AUTH_APPROVED: 'Prior Auth Approved',
  FILLING: 'Filling',
  VERIFICATION: 'Verification',
  READY: 'Ready for Pickup',
  SOLD: 'Sold',
  DELIVERED: 'Delivered',
  RETURNED_TO_STOCK: 'Returned to Stock',
  CANCELLED: 'Cancelled',
};

export const PRIORITY_DISPLAY: Record<WorkflowPriority, string> = {
  STAT: 'STAT',
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  LOW: 'Low Priority',
};

export const PRIORITY_ORDER: Record<WorkflowPriority, number> = {
  STAT: 0,
  URGENT: 1,
  NORMAL: 2,
  LOW: 3,
};

// ============================================
// STATE TRANSITION RULES
// ============================================

/**
 * Valid state transitions for the prescription workflow
 */
export const VALID_STATE_TRANSITIONS: Record<PrescriptionWorkflowState, PrescriptionWorkflowState[]> = {
  INTAKE: ['DATA_ENTRY', 'CANCELLED'],
  DATA_ENTRY: ['DATA_ENTRY_COMPLETE', 'INTAKE', 'CANCELLED'],
  DATA_ENTRY_COMPLETE: ['INSURANCE_PENDING', 'FILLING', 'DUR_REVIEW', 'CANCELLED'],
  INSURANCE_PENDING: ['INSURANCE_REJECTED', 'DUR_REVIEW', 'FILLING', 'PRIOR_AUTH_PENDING', 'CANCELLED'],
  INSURANCE_REJECTED: ['DATA_ENTRY', 'INSURANCE_PENDING', 'PRIOR_AUTH_PENDING', 'CANCELLED'],
  DUR_REVIEW: ['FILLING', 'CANCELLED'],
  PRIOR_AUTH_PENDING: ['PRIOR_AUTH_APPROVED', 'INSURANCE_REJECTED', 'CANCELLED'],
  PRIOR_AUTH_APPROVED: ['FILLING', 'CANCELLED'],
  FILLING: ['VERIFICATION', 'DATA_ENTRY', 'CANCELLED'],
  VERIFICATION: ['READY', 'FILLING', 'CANCELLED'],
  READY: ['SOLD', 'DELIVERED', 'RETURNED_TO_STOCK'],
  SOLD: [], // Terminal state
  DELIVERED: [], // Terminal state
  RETURNED_TO_STOCK: ['DATA_ENTRY'], // Can be re-entered
  CANCELLED: [], // Terminal state
};

/**
 * States that are terminal (no further transitions possible)
 */
export const TERMINAL_STATES: PrescriptionWorkflowState[] = ['SOLD', 'DELIVERED', 'CANCELLED'];

/**
 * States that require pharmacist level access
 */
export const PHARMACIST_REQUIRED_STATES: PrescriptionWorkflowState[] = [
  'DUR_REVIEW',
  'VERIFICATION',
];

/**
 * States that can be worked on by technicians
 */
export const TECH_ACCESSIBLE_STATES: PrescriptionWorkflowState[] = [
  'INTAKE',
  'DATA_ENTRY',
  'DATA_ENTRY_COMPLETE',
  'INSURANCE_PENDING',
  'INSURANCE_REJECTED',
  'PRIOR_AUTH_PENDING',
  'PRIOR_AUTH_APPROVED',
  'FILLING',
  'READY',
];

// ============================================
// WORKFLOW ITEM TYPES
// ============================================

export interface PrescriptionWorkflowItem {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientDOB: Date;
  drugName: string;
  strength: string | null;
  quantity: number;
  daysSupply: number;
  directions: string;
  workflowState: PrescriptionWorkflowState;
  priority: WorkflowPriority;
  promiseTime: Date | null;
  assignedToId: string | null;
  assignedToName: string | null;
  isControlled: boolean;
  deaSchedule: number | null;
  requiresCounseling: boolean;
  isOnHold: boolean;
  holdReason: string | null;
  durAlertCount: number;
  hasInsuranceIssue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStateChange {
  id: string;
  prescriptionId: string;
  fromState: PrescriptionWorkflowState | null;
  toState: PrescriptionWorkflowState;
  changedById: string;
  changedByName: string;
  changedAt: Date;
  reason: string | null;
  notes: string | null;
}

export interface WorkflowQueueSummary {
  intake: number;
  dataEntry: number;
  dataEntryComplete: number;
  insurancePending: number;
  insuranceRejected: number;
  durReview: number;
  priorAuthPending: number;
  priorAuthApproved: number;
  filling: number;
  verification: number;
  ready: number;
  total: number;
  statCount: number;
  urgentCount: number;
  overdueCount: number;
  onHoldCount: number;
}

// ============================================
// WORKFLOW FUNCTIONS
// ============================================

/**
 * Check if a state transition is valid
 */
export function isValidStateTransition(
  fromState: PrescriptionWorkflowState,
  toState: PrescriptionWorkflowState
): boolean {
  return VALID_STATE_TRANSITIONS[fromState].includes(toState);
}

/**
 * Get valid next states from current state
 */
export function getValidNextStates(
  currentState: PrescriptionWorkflowState
): PrescriptionWorkflowState[] {
  return VALID_STATE_TRANSITIONS[currentState];
}

/**
 * Check if a state is terminal
 */
export function isTerminalState(state: PrescriptionWorkflowState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Check if a state requires pharmacist access
 */
export function requiresPharmacist(state: PrescriptionWorkflowState): boolean {
  return PHARMACIST_REQUIRED_STATES.includes(state);
}

/**
 * Check if a tech can work on this state
 */
export function isTechAccessible(state: PrescriptionWorkflowState): boolean {
  return TECH_ACCESSIBLE_STATES.includes(state);
}

export interface StateTransitionResult {
  success: boolean;
  error?: string;
  fromState: PrescriptionWorkflowState;
  toState: PrescriptionWorkflowState;
  stateChange?: WorkflowStateChange;
}

/**
 * Attempt to transition a prescription to a new state
 */
export function validateStateTransition(
  currentState: PrescriptionWorkflowState,
  targetState: PrescriptionWorkflowState,
  options?: {
    isPharmacist?: boolean;
    hasUnresolvedDUR?: boolean;
    hasInsuranceReject?: boolean;
  }
): StateTransitionResult {
  // Check if transition is valid
  if (!isValidStateTransition(currentState, targetState)) {
    return {
      success: false,
      error: `Invalid transition from ${currentState} to ${targetState}`,
      fromState: currentState,
      toState: targetState,
    };
  }

  // Check pharmacist requirement
  if (requiresPharmacist(targetState) && !options?.isPharmacist) {
    return {
      success: false,
      error: `State ${targetState} requires pharmacist access`,
      fromState: currentState,
      toState: targetState,
    };
  }

  // Check DUR alerts for FILLING state
  if (targetState === 'FILLING' && options?.hasUnresolvedDUR) {
    return {
      success: false,
      error: 'Cannot proceed to filling with unresolved DUR alerts',
      fromState: currentState,
      toState: targetState,
    };
  }

  // Check insurance for FILLING state (unless coming from DUR_REVIEW or PA_APPROVED)
  if (
    targetState === 'FILLING' &&
    options?.hasInsuranceReject &&
    currentState !== 'DUR_REVIEW' &&
    currentState !== 'PRIOR_AUTH_APPROVED'
  ) {
    return {
      success: false,
      error: 'Cannot proceed to filling with unresolved insurance rejection',
      fromState: currentState,
      toState: targetState,
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
  };
}

/**
 * Create a state change record
 */
export function createStateChange(
  prescriptionId: string,
  fromState: PrescriptionWorkflowState | null,
  toState: PrescriptionWorkflowState,
  userId: string,
  userName: string,
  reason?: string,
  notes?: string
): WorkflowStateChange {
  return {
    id: `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    prescriptionId,
    fromState,
    toState,
    changedById: userId,
    changedByName: userName,
    changedAt: new Date(),
    reason: reason ?? null,
    notes: notes ?? null,
  };
}

/**
 * Calculate queue summary from workflow items
 */
export function calculateQueueSummary(items: PrescriptionWorkflowItem[]): WorkflowQueueSummary {
  const now = new Date();

  const summary: WorkflowQueueSummary = {
    intake: 0,
    dataEntry: 0,
    dataEntryComplete: 0,
    insurancePending: 0,
    insuranceRejected: 0,
    durReview: 0,
    priorAuthPending: 0,
    priorAuthApproved: 0,
    filling: 0,
    verification: 0,
    ready: 0,
    total: 0,
    statCount: 0,
    urgentCount: 0,
    overdueCount: 0,
    onHoldCount: 0,
  };

  for (const item of items) {
    // Count by state (only active states)
    switch (item.workflowState) {
      case 'INTAKE': summary.intake++; break;
      case 'DATA_ENTRY': summary.dataEntry++; break;
      case 'DATA_ENTRY_COMPLETE': summary.dataEntryComplete++; break;
      case 'INSURANCE_PENDING': summary.insurancePending++; break;
      case 'INSURANCE_REJECTED': summary.insuranceRejected++; break;
      case 'DUR_REVIEW': summary.durReview++; break;
      case 'PRIOR_AUTH_PENDING': summary.priorAuthPending++; break;
      case 'PRIOR_AUTH_APPROVED': summary.priorAuthApproved++; break;
      case 'FILLING': summary.filling++; break;
      case 'VERIFICATION': summary.verification++; break;
      case 'READY': summary.ready++; break;
    }

    // Count by priority
    if (item.priority === 'STAT') summary.statCount++;
    if (item.priority === 'URGENT') summary.urgentCount++;

    // Check if overdue
    if (item.promiseTime && item.promiseTime < now && !isTerminalState(item.workflowState)) {
      summary.overdueCount++;
    }

    // Check if on hold
    if (item.isOnHold) {
      summary.onHoldCount++;
    }
  }

  summary.total = items.filter(i => !isTerminalState(i.workflowState)).length;

  return summary;
}

/**
 * Sort workflow items by priority and promise time
 */
export function sortWorkflowItems(items: PrescriptionWorkflowItem[]): PrescriptionWorkflowItem[] {
  return [...items].sort((a, b) => {
    // First by priority
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by promise time (earliest first, null last)
    if (a.promiseTime && b.promiseTime) {
      return a.promiseTime.getTime() - b.promiseTime.getTime();
    }
    if (a.promiseTime) return -1;
    if (b.promiseTime) return 1;

    // Finally by creation time (oldest first)
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Filter workflow items by state
 */
export function filterByState(
  items: PrescriptionWorkflowItem[],
  states: PrescriptionWorkflowState[]
): PrescriptionWorkflowItem[] {
  return items.filter(item => states.includes(item.workflowState));
}

/**
 * Filter workflow items by assignee
 */
export function filterByAssignee(
  items: PrescriptionWorkflowItem[],
  userId: string
): PrescriptionWorkflowItem[] {
  return items.filter(item => item.assignedToId === userId);
}

/**
 * Get the expected next state based on common workflow patterns
 */
export function getExpectedNextState(
  currentState: PrescriptionWorkflowState,
  options?: {
    hasDURAlerts?: boolean;
    hasInsurance?: boolean;
    insuranceApproved?: boolean;
    needsPriorAuth?: boolean;
  }
): PrescriptionWorkflowState | null {
  switch (currentState) {
    case 'INTAKE':
      return 'DATA_ENTRY';

    case 'DATA_ENTRY':
      return 'DATA_ENTRY_COMPLETE';

    case 'DATA_ENTRY_COMPLETE':
      if (!options?.hasInsurance) {
        // Cash prescription - check DUR
        return options?.hasDURAlerts ? 'DUR_REVIEW' : 'FILLING';
      }
      return 'INSURANCE_PENDING';

    case 'INSURANCE_PENDING':
      if (options?.needsPriorAuth) return 'PRIOR_AUTH_PENDING';
      if (options?.insuranceApproved === false) return 'INSURANCE_REJECTED';
      return options?.hasDURAlerts ? 'DUR_REVIEW' : 'FILLING';

    case 'INSURANCE_REJECTED':
      return 'DATA_ENTRY'; // Go back for re-entry or cash

    case 'DUR_REVIEW':
      return 'FILLING';

    case 'PRIOR_AUTH_PENDING':
      return 'PRIOR_AUTH_APPROVED';

    case 'PRIOR_AUTH_APPROVED':
      return 'FILLING';

    case 'FILLING':
      return 'VERIFICATION';

    case 'VERIFICATION':
      return 'READY';

    case 'READY':
      return 'SOLD';

    default:
      return null;
  }
}

/**
 * Calculate promise time based on priority and state
 */
export function calculatePromiseTime(
  priority: WorkflowPriority,
  currentState: PrescriptionWorkflowState,
  fromTime: Date = new Date()
): Date {
  const promiseTime = new Date(fromTime);

  // Base times in minutes by priority
  const baseTimes: Record<WorkflowPriority, number> = {
    STAT: 15,
    URGENT: 30,
    NORMAL: 60,
    LOW: 120,
  };

  // Add time based on current state (how much work remains)
  const stateMultipliers: Partial<Record<PrescriptionWorkflowState, number>> = {
    INTAKE: 1.5,
    DATA_ENTRY: 1.3,
    DATA_ENTRY_COMPLETE: 1.2,
    INSURANCE_PENDING: 1.1,
    FILLING: 1.0,
    VERIFICATION: 0.5,
  };

  const baseMinutes = baseTimes[priority];
  const multiplier = stateMultipliers[currentState] ?? 1.0;

  promiseTime.setMinutes(promiseTime.getMinutes() + Math.round(baseMinutes * multiplier));

  return promiseTime;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const WorkflowStateSchema = z.enum([
  'INTAKE',
  'DATA_ENTRY',
  'DATA_ENTRY_COMPLETE',
  'INSURANCE_PENDING',
  'INSURANCE_REJECTED',
  'DUR_REVIEW',
  'PRIOR_AUTH_PENDING',
  'PRIOR_AUTH_APPROVED',
  'FILLING',
  'VERIFICATION',
  'READY',
  'SOLD',
  'DELIVERED',
  'RETURNED_TO_STOCK',
  'CANCELLED',
]);

export const WorkflowPrioritySchema = z.enum(['STAT', 'URGENT', 'NORMAL', 'LOW']);

export const StateTransitionInputSchema = z.object({
  prescriptionId: z.string(),
  targetState: WorkflowStateSchema,
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const WorkflowItemFilterSchema = z.object({
  states: z.array(WorkflowStateSchema).optional(),
  priority: WorkflowPrioritySchema.optional(),
  assignedToId: z.string().optional(),
  isControlled: z.boolean().optional(),
  isOnHold: z.boolean().optional(),
  hasInsuranceIssue: z.boolean().optional(),
  overdueOnly: z.boolean().optional(),
});
