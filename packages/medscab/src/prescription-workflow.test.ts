import { describe, it, expect } from 'vitest';
import {
  VALID_STATE_TRANSITIONS,
  TERMINAL_STATES,
  PHARMACIST_REQUIRED_STATES,
  TECH_ACCESSIBLE_STATES,
  WORKFLOW_STATE_DISPLAY,
  PRIORITY_ORDER,
  isValidStateTransition,
  getValidNextStates,
  isTerminalState,
  requiresPharmacist,
  isTechAccessible,
  validateStateTransition,
  createStateChange,
  calculateQueueSummary,
  sortWorkflowItems,
  filterByState,
  filterByAssignee,
  getExpectedNextState,
  calculatePromiseTime,
  type PrescriptionWorkflowItem,
  type PrescriptionWorkflowState,
  type WorkflowPriority,
} from './prescription-workflow';

describe('Prescription Workflow Module', () => {
  describe('VALID_STATE_TRANSITIONS', () => {
    it('should define valid transitions from INTAKE', () => {
      expect(VALID_STATE_TRANSITIONS.INTAKE).toContain('DATA_ENTRY');
      expect(VALID_STATE_TRANSITIONS.INTAKE).toContain('CANCELLED');
      expect(VALID_STATE_TRANSITIONS.INTAKE).not.toContain('FILLING');
    });

    it('should define terminal states with no transitions', () => {
      expect(VALID_STATE_TRANSITIONS.SOLD).toHaveLength(0);
      expect(VALID_STATE_TRANSITIONS.DELIVERED).toHaveLength(0);
      expect(VALID_STATE_TRANSITIONS.CANCELLED).toHaveLength(0);
    });

    it('should allow VERIFICATION to transition to READY or FILLING', () => {
      expect(VALID_STATE_TRANSITIONS.VERIFICATION).toContain('READY');
      expect(VALID_STATE_TRANSITIONS.VERIFICATION).toContain('FILLING');
      expect(VALID_STATE_TRANSITIONS.VERIFICATION).toContain('CANCELLED');
    });

    it('should allow RETURNED_TO_STOCK to re-enter DATA_ENTRY', () => {
      expect(VALID_STATE_TRANSITIONS.RETURNED_TO_STOCK).toContain('DATA_ENTRY');
    });

    it('should define complete workflow path', () => {
      // Verify common workflow path is valid
      expect(VALID_STATE_TRANSITIONS.INTAKE).toContain('DATA_ENTRY');
      expect(VALID_STATE_TRANSITIONS.DATA_ENTRY).toContain('DATA_ENTRY_COMPLETE');
      expect(VALID_STATE_TRANSITIONS.DATA_ENTRY_COMPLETE).toContain('INSURANCE_PENDING');
      expect(VALID_STATE_TRANSITIONS.INSURANCE_PENDING).toContain('FILLING');
      expect(VALID_STATE_TRANSITIONS.FILLING).toContain('VERIFICATION');
      expect(VALID_STATE_TRANSITIONS.VERIFICATION).toContain('READY');
      expect(VALID_STATE_TRANSITIONS.READY).toContain('SOLD');
    });
  });

  describe('TERMINAL_STATES', () => {
    it('should include SOLD, DELIVERED, and CANCELLED', () => {
      expect(TERMINAL_STATES).toContain('SOLD');
      expect(TERMINAL_STATES).toContain('DELIVERED');
      expect(TERMINAL_STATES).toContain('CANCELLED');
    });

    it('should not include active workflow states', () => {
      expect(TERMINAL_STATES).not.toContain('FILLING');
      expect(TERMINAL_STATES).not.toContain('VERIFICATION');
      expect(TERMINAL_STATES).not.toContain('READY');
    });
  });

  describe('PHARMACIST_REQUIRED_STATES', () => {
    it('should require pharmacist for DUR_REVIEW and VERIFICATION', () => {
      expect(PHARMACIST_REQUIRED_STATES).toContain('DUR_REVIEW');
      expect(PHARMACIST_REQUIRED_STATES).toContain('VERIFICATION');
    });
  });

  describe('TECH_ACCESSIBLE_STATES', () => {
    it('should allow techs to access INTAKE, DATA_ENTRY, FILLING', () => {
      expect(TECH_ACCESSIBLE_STATES).toContain('INTAKE');
      expect(TECH_ACCESSIBLE_STATES).toContain('DATA_ENTRY');
      expect(TECH_ACCESSIBLE_STATES).toContain('FILLING');
    });

    it('should not allow techs to access VERIFICATION', () => {
      expect(TECH_ACCESSIBLE_STATES).not.toContain('VERIFICATION');
      expect(TECH_ACCESSIBLE_STATES).not.toContain('DUR_REVIEW');
    });
  });

  describe('isValidStateTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidStateTransition('INTAKE', 'DATA_ENTRY')).toBe(true);
      expect(isValidStateTransition('FILLING', 'VERIFICATION')).toBe(true);
      expect(isValidStateTransition('READY', 'SOLD')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidStateTransition('INTAKE', 'SOLD')).toBe(false);
      expect(isValidStateTransition('FILLING', 'READY')).toBe(false);
      expect(isValidStateTransition('SOLD', 'INTAKE')).toBe(false);
    });

    it('should return false for transitions from terminal states', () => {
      expect(isValidStateTransition('SOLD', 'DATA_ENTRY')).toBe(false);
      expect(isValidStateTransition('CANCELLED', 'INTAKE')).toBe(false);
    });
  });

  describe('getValidNextStates', () => {
    it('should return valid next states from INTAKE', () => {
      const nextStates = getValidNextStates('INTAKE');
      expect(nextStates).toContain('DATA_ENTRY');
      expect(nextStates).toContain('CANCELLED');
    });

    it('should return empty array for terminal states', () => {
      expect(getValidNextStates('SOLD')).toHaveLength(0);
      expect(getValidNextStates('CANCELLED')).toHaveLength(0);
    });
  });

  describe('isTerminalState', () => {
    it('should return true for terminal states', () => {
      expect(isTerminalState('SOLD')).toBe(true);
      expect(isTerminalState('DELIVERED')).toBe(true);
      expect(isTerminalState('CANCELLED')).toBe(true);
    });

    it('should return false for active states', () => {
      expect(isTerminalState('FILLING')).toBe(false);
      expect(isTerminalState('VERIFICATION')).toBe(false);
    });
  });

  describe('requiresPharmacist', () => {
    it('should return true for pharmacist-required states', () => {
      expect(requiresPharmacist('DUR_REVIEW')).toBe(true);
      expect(requiresPharmacist('VERIFICATION')).toBe(true);
    });

    it('should return false for tech-accessible states', () => {
      expect(requiresPharmacist('FILLING')).toBe(false);
      expect(requiresPharmacist('DATA_ENTRY')).toBe(false);
    });
  });

  describe('isTechAccessible', () => {
    it('should return true for tech-accessible states', () => {
      expect(isTechAccessible('INTAKE')).toBe(true);
      expect(isTechAccessible('DATA_ENTRY')).toBe(true);
      expect(isTechAccessible('FILLING')).toBe(true);
    });

    it('should return false for pharmacist-only states', () => {
      expect(isTechAccessible('VERIFICATION')).toBe(false);
      expect(isTechAccessible('DUR_REVIEW')).toBe(false);
    });
  });

  describe('validateStateTransition', () => {
    it('should succeed for valid transitions', () => {
      const result = validateStateTransition('FILLING', 'VERIFICATION', { isPharmacist: true });
      expect(result.success).toBe(true);
      expect(result.fromState).toBe('FILLING');
      expect(result.toState).toBe('VERIFICATION');
    });

    it('should fail for invalid transitions', () => {
      const result = validateStateTransition('INTAKE', 'SOLD');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should fail when pharmacist required but not present', () => {
      const result = validateStateTransition('FILLING', 'VERIFICATION', { isPharmacist: false });
      expect(result.success).toBe(false);
      expect(result.error).toContain('pharmacist access');
    });

    it('should fail when transitioning to FILLING with unresolved DUR', () => {
      const result = validateStateTransition('DATA_ENTRY_COMPLETE', 'FILLING', {
        hasUnresolvedDUR: true,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('unresolved DUR');
    });

    it('should fail when transitioning to FILLING with insurance rejection', () => {
      const result = validateStateTransition('DATA_ENTRY_COMPLETE', 'FILLING', {
        hasInsuranceReject: true,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('insurance rejection');
    });

    it('should allow FILLING from DUR_REVIEW even with insurance issues', () => {
      const result = validateStateTransition('DUR_REVIEW', 'FILLING', {
        hasInsuranceReject: true,
        isPharmacist: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createStateChange', () => {
    it('should create state change record with correct fields', () => {
      const stateChange = createStateChange(
        'RX-001',
        'FILLING',
        'VERIFICATION',
        'USER-001',
        'John Doe',
        'Fill complete',
        'Ready for RPh review'
      );

      expect(stateChange.prescriptionId).toBe('RX-001');
      expect(stateChange.fromState).toBe('FILLING');
      expect(stateChange.toState).toBe('VERIFICATION');
      expect(stateChange.changedById).toBe('USER-001');
      expect(stateChange.changedByName).toBe('John Doe');
      expect(stateChange.reason).toBe('Fill complete');
      expect(stateChange.notes).toBe('Ready for RPh review');
      expect(stateChange.changedAt).toBeInstanceOf(Date);
      expect(stateChange.id).toMatch(/^SC-/);
    });

    it('should handle null from state for new prescriptions', () => {
      const stateChange = createStateChange(
        'RX-002',
        null,
        'INTAKE',
        'USER-001',
        'Jane Doe'
      );

      expect(stateChange.fromState).toBeNull();
      expect(stateChange.toState).toBe('INTAKE');
    });
  });

  describe('calculateQueueSummary', () => {
    it('should count items by state', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'INTAKE', 'NORMAL'),
        createMockWorkflowItem('2', 'INTAKE', 'NORMAL'),
        createMockWorkflowItem('3', 'FILLING', 'NORMAL'),
        createMockWorkflowItem('4', 'VERIFICATION', 'NORMAL'),
        createMockWorkflowItem('5', 'READY', 'NORMAL'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.intake).toBe(2);
      expect(summary.filling).toBe(1);
      expect(summary.verification).toBe(1);
      expect(summary.ready).toBe(1);
      expect(summary.total).toBe(5);
    });

    it('should count STAT and URGENT items', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'STAT'),
        createMockWorkflowItem('2', 'FILLING', 'STAT'),
        createMockWorkflowItem('3', 'FILLING', 'URGENT'),
        createMockWorkflowItem('4', 'FILLING', 'NORMAL'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.statCount).toBe(2);
      expect(summary.urgentCount).toBe(1);
    });

    it('should count overdue items', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const items: PrescriptionWorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'FILLING', 'NORMAL'), promiseTime: pastTime },
        { ...createMockWorkflowItem('2', 'VERIFICATION', 'NORMAL'), promiseTime: pastTime },
        createMockWorkflowItem('3', 'READY', 'NORMAL'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.overdueCount).toBe(2);
    });

    it('should count items on hold', () => {
      const items: PrescriptionWorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'FILLING', 'NORMAL'), isOnHold: true },
        { ...createMockWorkflowItem('2', 'FILLING', 'NORMAL'), isOnHold: true },
        createMockWorkflowItem('3', 'FILLING', 'NORMAL'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.onHoldCount).toBe(2);
    });

    it('should not count terminal states in total', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'NORMAL'),
        createMockWorkflowItem('2', 'SOLD', 'NORMAL'),
        createMockWorkflowItem('3', 'CANCELLED', 'NORMAL'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.total).toBe(1);
    });
  });

  describe('sortWorkflowItems', () => {
    it('should sort by priority (STAT > URGENT > NORMAL > LOW)', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'NORMAL'),
        createMockWorkflowItem('2', 'FILLING', 'STAT'),
        createMockWorkflowItem('3', 'FILLING', 'LOW'),
        createMockWorkflowItem('4', 'FILLING', 'URGENT'),
      ];

      const sorted = sortWorkflowItems(items);

      expect(sorted[0]?.priority).toBe('STAT');
      expect(sorted[1]?.priority).toBe('URGENT');
      expect(sorted[2]?.priority).toBe('NORMAL');
      expect(sorted[3]?.priority).toBe('LOW');
    });

    it('should sort by promise time within same priority', () => {
      const early = new Date();
      early.setHours(early.getHours() + 1);

      const late = new Date();
      late.setHours(late.getHours() + 3);

      const items: PrescriptionWorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'FILLING', 'NORMAL'), promiseTime: late },
        { ...createMockWorkflowItem('2', 'FILLING', 'NORMAL'), promiseTime: early },
      ];

      const sorted = sortWorkflowItems(items);

      expect(sorted[0]?.id).toBe('2');
      expect(sorted[1]?.id).toBe('1');
    });

    it('should not mutate original array', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'LOW'),
        createMockWorkflowItem('2', 'FILLING', 'STAT'),
      ];

      const sorted = sortWorkflowItems(items);

      expect(items[0]?.id).toBe('1');
      expect(sorted[0]?.id).toBe('2');
    });
  });

  describe('filterByState', () => {
    it('should filter by single state', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'NORMAL'),
        createMockWorkflowItem('2', 'VERIFICATION', 'NORMAL'),
        createMockWorkflowItem('3', 'FILLING', 'URGENT'),
      ];

      const filtered = filterByState(items, ['FILLING']);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(i => i.workflowState === 'FILLING')).toBe(true);
    });

    it('should filter by multiple states', () => {
      const items: PrescriptionWorkflowItem[] = [
        createMockWorkflowItem('1', 'FILLING', 'NORMAL'),
        createMockWorkflowItem('2', 'VERIFICATION', 'NORMAL'),
        createMockWorkflowItem('3', 'READY', 'NORMAL'),
      ];

      const filtered = filterByState(items, ['FILLING', 'VERIFICATION']);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('filterByAssignee', () => {
    it('should filter by assigned user', () => {
      const items: PrescriptionWorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'FILLING', 'NORMAL'), assignedToId: 'USER-001' },
        { ...createMockWorkflowItem('2', 'FILLING', 'NORMAL'), assignedToId: 'USER-002' },
        { ...createMockWorkflowItem('3', 'FILLING', 'NORMAL'), assignedToId: 'USER-001' },
      ];

      const filtered = filterByAssignee(items, 'USER-001');

      expect(filtered).toHaveLength(2);
    });
  });

  describe('getExpectedNextState', () => {
    it('should return DATA_ENTRY from INTAKE', () => {
      expect(getExpectedNextState('INTAKE')).toBe('DATA_ENTRY');
    });

    it('should return INSURANCE_PENDING from DATA_ENTRY_COMPLETE with insurance', () => {
      expect(getExpectedNextState('DATA_ENTRY_COMPLETE', { hasInsurance: true })).toBe('INSURANCE_PENDING');
    });

    it('should return FILLING from DATA_ENTRY_COMPLETE for cash', () => {
      expect(getExpectedNextState('DATA_ENTRY_COMPLETE', { hasInsurance: false })).toBe('FILLING');
    });

    it('should return DUR_REVIEW when DUR alerts present', () => {
      expect(getExpectedNextState('DATA_ENTRY_COMPLETE', {
        hasInsurance: false,
        hasDURAlerts: true,
      })).toBe('DUR_REVIEW');
    });

    it('should return PRIOR_AUTH_PENDING when PA needed', () => {
      expect(getExpectedNextState('INSURANCE_PENDING', { needsPriorAuth: true })).toBe('PRIOR_AUTH_PENDING');
    });

    it('should return null for terminal states', () => {
      expect(getExpectedNextState('SOLD')).toBeNull();
      expect(getExpectedNextState('CANCELLED')).toBeNull();
    });
  });

  describe('calculatePromiseTime', () => {
    it('should return faster promise time for STAT priority', () => {
      const statTime = calculatePromiseTime('STAT', 'FILLING');
      const normalTime = calculatePromiseTime('NORMAL', 'FILLING');

      expect(statTime.getTime()).toBeLessThan(normalTime.getTime());
    });

    it('should return longer promise time for earlier states', () => {
      const intakeTime = calculatePromiseTime('NORMAL', 'INTAKE');
      const verifyTime = calculatePromiseTime('NORMAL', 'VERIFICATION');

      expect(intakeTime.getTime()).toBeGreaterThan(verifyTime.getTime());
    });

    it('should use provided start time', () => {
      const startTime = new Date('2024-01-15T10:00:00');
      const promiseTime = calculatePromiseTime('NORMAL', 'FILLING', startTime);

      expect(promiseTime.getTime()).toBeGreaterThan(startTime.getTime());
    });
  });

  describe('WORKFLOW_STATE_DISPLAY', () => {
    it('should have display names for all states', () => {
      expect(WORKFLOW_STATE_DISPLAY.INTAKE).toBe('Intake');
      expect(WORKFLOW_STATE_DISPLAY.VERIFICATION).toBe('Verification');
      expect(WORKFLOW_STATE_DISPLAY.READY).toBe('Ready for Pickup');
    });
  });

  describe('PRIORITY_ORDER', () => {
    it('should have correct ordering', () => {
      expect(PRIORITY_ORDER.STAT).toBeLessThan(PRIORITY_ORDER.URGENT);
      expect(PRIORITY_ORDER.URGENT).toBeLessThan(PRIORITY_ORDER.NORMAL);
      expect(PRIORITY_ORDER.NORMAL).toBeLessThan(PRIORITY_ORDER.LOW);
    });
  });
});

// Helper function
function createMockWorkflowItem(
  id: string,
  state: PrescriptionWorkflowState,
  priority: WorkflowPriority
): PrescriptionWorkflowItem {
  return {
    id,
    rxNumber: `123456${id}`,
    patientId: 'PAT-001',
    patientName: 'Test Patient',
    patientDOB: new Date('1980-01-01'),
    drugName: 'Test Drug',
    strength: '10mg',
    quantity: 30,
    daysSupply: 30,
    directions: 'Take one tablet daily',
    workflowState: state,
    priority,
    promiseTime: null,
    assignedToId: null,
    assignedToName: null,
    isControlled: false,
    deaSchedule: null,
    requiresCounseling: false,
    isOnHold: false,
    holdReason: null,
    durAlertCount: 0,
    hasInsuranceIssue: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
