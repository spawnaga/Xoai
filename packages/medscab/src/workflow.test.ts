import { describe, it, expect } from 'vitest';
import {
  VALID_TRANSITIONS,
  DEFAULT_THRESHOLDS,
  calculateQueueSummary,
  getQueueColor,
  sortWorkflowItems,
  filterByState,
  filterByAssignee,
  calculateWaitTimeStats,
  isValidTransition,
  transitionState,
  generateNotificationMessage,
  shouldSendNotification,
  calculateReturnDate,
  getReadyForReturn,
  type WorkflowItem,
  type WorkflowState,
  type NotificationPreferences,
  type WillCallBin,
} from './workflow';

describe('Workflow Module', () => {
  describe('VALID_TRANSITIONS', () => {
    it('should define valid transitions from intake', () => {
      expect(VALID_TRANSITIONS.intake).toContain('data_entry');
      expect(VALID_TRANSITIONS.intake).toContain('cancelled');
      expect(VALID_TRANSITIONS.intake).toContain('on_hold');
    });

    it('should define terminal states with no transitions', () => {
      expect(VALID_TRANSITIONS.sold).toHaveLength(0);
      expect(VALID_TRANSITIONS.delivered).toHaveLength(0);
      expect(VALID_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it('should allow on_hold to transition back to active states', () => {
      expect(VALID_TRANSITIONS.on_hold).toContain('intake');
      expect(VALID_TRANSITIONS.on_hold).toContain('filling');
      expect(VALID_TRANSITIONS.on_hold).toContain('ready');
    });
  });

  describe('calculateQueueSummary', () => {
    it('should count items by state', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'intake', 'normal'),
        createMockWorkflowItem('2', 'intake', 'normal'),
        createMockWorkflowItem('3', 'filling', 'normal'),
        createMockWorkflowItem('4', 'verification', 'normal'),
        createMockWorkflowItem('5', 'ready', 'normal'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.intake).toBe(2);
      expect(summary.filling).toBe(1);
      expect(summary.verification).toBe(1);
      expect(summary.ready).toBe(1);
      expect(summary.total).toBe(5);
    });

    it('should count stat and urgent items', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'filling', 'stat'),
        createMockWorkflowItem('2', 'filling', 'stat'),
        createMockWorkflowItem('3', 'filling', 'urgent'),
        createMockWorkflowItem('4', 'filling', 'normal'),
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.statCount).toBe(2);
      expect(summary.urgentCount).toBe(1);
    });

    it('should count overdue items', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const items: WorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: pastTime },
        { ...createMockWorkflowItem('2', 'verification', 'normal'), promiseTime: pastTime },
        createMockWorkflowItem('3', 'ready', 'normal'), // No promise time
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.overdueCount).toBe(2);
    });

    it('should not count sold/delivered as overdue', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const items: WorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'sold', 'normal'), promiseTime: pastTime },
      ];

      const summary = calculateQueueSummary(items);

      expect(summary.overdueCount).toBe(0);
    });
  });

  describe('getQueueColor', () => {
    it('should return green when no promise time', () => {
      const item = createMockWorkflowItem('1', 'filling', 'normal');
      expect(getQueueColor(item)).toBe('green');
    });

    it('should return green when on track', () => {
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + 30);

      const item = { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: futureTime };

      expect(getQueueColor(item)).toBe('green');
    });

    it('should return yellow when approaching due time', () => {
      const soonTime = new Date();
      soonTime.setMinutes(soonTime.getMinutes() + 10);

      const item = { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: soonTime };

      expect(getQueueColor(item)).toBe('yellow');
    });

    it('should return red when overdue', () => {
      const pastTime = new Date();
      pastTime.setMinutes(pastTime.getMinutes() - 5);

      const item = { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: pastTime };

      expect(getQueueColor(item)).toBe('red');
    });

    it('should respect custom thresholds', () => {
      const soonTime = new Date();
      soonTime.setMinutes(soonTime.getMinutes() + 25);

      const item = { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: soonTime };

      expect(getQueueColor(item, { yellow: 30, red: 0 })).toBe('yellow');
      expect(getQueueColor(item, { yellow: 15, red: 0 })).toBe('green');
    });
  });

  describe('sortWorkflowItems', () => {
    it('should sort by priority (stat > urgent > normal > low)', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'filling', 'normal'),
        createMockWorkflowItem('2', 'filling', 'stat'),
        createMockWorkflowItem('3', 'filling', 'low'),
        createMockWorkflowItem('4', 'filling', 'urgent'),
      ];

      const sorted = sortWorkflowItems(items);

      expect(sorted[0]?.priority).toBe('stat');
      expect(sorted[1]?.priority).toBe('urgent');
      expect(sorted[2]?.priority).toBe('normal');
      expect(sorted[3]?.priority).toBe('low');
    });

    it('should sort by promise time within same priority', () => {
      const early = new Date();
      early.setHours(early.getHours() + 1);

      const late = new Date();
      late.setHours(late.getHours() + 3);

      const items: WorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'filling', 'normal'), promiseTime: late },
        { ...createMockWorkflowItem('2', 'filling', 'normal'), promiseTime: early },
      ];

      const sorted = sortWorkflowItems(items);

      expect(sorted[0]?.id).toBe('2'); // Earlier promise time
      expect(sorted[1]?.id).toBe('1');
    });

    it('should not mutate original array', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'filling', 'low'),
        createMockWorkflowItem('2', 'filling', 'stat'),
      ];

      const sorted = sortWorkflowItems(items);

      expect(items[0]?.id).toBe('1');
      expect(sorted[0]?.id).toBe('2');
    });
  });

  describe('filterByState', () => {
    it('should filter by single state', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'filling', 'normal'),
        createMockWorkflowItem('2', 'verification', 'normal'),
        createMockWorkflowItem('3', 'filling', 'urgent'),
      ];

      const filtered = filterByState(items, ['filling']);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(i => i.state === 'filling')).toBe(true);
    });

    it('should filter by multiple states', () => {
      const items: WorkflowItem[] = [
        createMockWorkflowItem('1', 'filling', 'normal'),
        createMockWorkflowItem('2', 'verification', 'normal'),
        createMockWorkflowItem('3', 'ready', 'normal'),
      ];

      const filtered = filterByState(items, ['filling', 'verification']);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('filterByAssignee', () => {
    it('should filter by assigned user', () => {
      const items: WorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'filling', 'normal'), assignedTo: 'USER-001' },
        { ...createMockWorkflowItem('2', 'filling', 'normal'), assignedTo: 'USER-002' },
        { ...createMockWorkflowItem('3', 'filling', 'normal'), assignedTo: 'USER-001' },
      ];

      const filtered = filterByAssignee(items, 'USER-001');

      expect(filtered).toHaveLength(2);
    });
  });

  describe('calculateWaitTimeStats', () => {
    it('should calculate wait time statistics', () => {
      const now = new Date();
      const items: WorkflowItem[] = [
        { ...createMockWorkflowItem('1', 'filling', 'normal'), createdAt: new Date(now.getTime() - 10 * 60000) }, // 10 min
        { ...createMockWorkflowItem('2', 'filling', 'normal'), createdAt: new Date(now.getTime() - 20 * 60000) }, // 20 min
        { ...createMockWorkflowItem('3', 'filling', 'normal'), createdAt: new Date(now.getTime() - 30 * 60000) }, // 30 min
      ];

      const stats = calculateWaitTimeStats(items);

      expect(stats.count).toBe(3);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.average).toBe(20);
      expect(stats.median).toBe(20);
    });

    it('should handle empty array', () => {
      const stats = calculateWaitTimeStats([]);

      expect(stats.count).toBe(0);
      expect(stats.average).toBe(0);
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidTransition('intake', 'data_entry')).toBe(true);
      expect(isValidTransition('filling', 'verification')).toBe(true);
      expect(isValidTransition('ready', 'sold')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidTransition('intake', 'sold')).toBe(false);
      expect(isValidTransition('filling', 'ready')).toBe(false);
      expect(isValidTransition('sold', 'intake')).toBe(false);
    });
  });

  describe('transitionState', () => {
    it('should transition to valid state', () => {
      const item = createMockWorkflowItem('1', 'filling', 'normal');

      const result = transitionState(item, 'verification', 'USER-001');

      expect(result.success).toBe(true);
      expect(result.item.state).toBe('verification');
      expect(result.stateChange?.fromState).toBe('filling');
      expect(result.stateChange?.toState).toBe('verification');
    });

    it('should record state history', () => {
      const item = createMockWorkflowItem('1', 'filling', 'normal');

      const result = transitionState(item, 'verification', 'USER-001', 'Verification complete');

      expect(result.item.stateHistory).toHaveLength(1);
      expect(result.item.stateHistory[0]?.reason).toBe('Verification complete');
    });

    it('should fail for invalid transition', () => {
      const item = createMockWorkflowItem('1', 'filling', 'normal');

      const result = transitionState(item, 'sold', 'USER-001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(result.item.state).toBe('filling'); // Unchanged
    });

    it('should set holdReason when transitioning to on_hold', () => {
      const item = createMockWorkflowItem('1', 'filling', 'normal');

      const result = transitionState(item, 'on_hold', 'USER-001', 'Waiting for insurance');

      expect(result.success).toBe(true);
      expect(result.item.holdReason).toBe('Waiting for insurance');
    });

    it('should clear holdReason when leaving on_hold', () => {
      const item = { ...createMockWorkflowItem('1', 'on_hold', 'normal'), holdReason: 'Previous reason' };

      const result = transitionState(item, 'filling', 'USER-001');

      expect(result.success).toBe(true);
      expect(result.item.holdReason).toBeUndefined();
    });
  });

  describe('generateNotificationMessage', () => {
    const baseData = {
      pharmacyName: 'Test Pharmacy',
      drugName: 'Lisinopril 10mg',
    };

    it('should generate rx_ready message', () => {
      const message = generateNotificationMessage('rx_ready', baseData);

      expect(message).toContain('Test Pharmacy');
      expect(message).toContain('Lisinopril 10mg');
      expect(message).toContain('ready');
    });

    it('should include pickup hours if provided', () => {
      const message = generateNotificationMessage('rx_ready', {
        ...baseData,
        pickupHours: '9am-6pm',
      });

      expect(message).toContain('9am-6pm');
    });

    it('should generate refill_reminder message', () => {
      const message = generateNotificationMessage('refill_reminder', baseData);

      expect(message).toContain('refill');
      expect(message).toContain('YES');
    });

    it('should generate insurance_issue message', () => {
      const message = generateNotificationMessage('insurance_issue', {
        ...baseData,
        pharmacyPhone: '555-1234',
      });

      expect(message).toContain('insurance');
      expect(message).toContain('555-1234');
    });

    it('should generate delivery_scheduled message', () => {
      const message = generateNotificationMessage('delivery_scheduled', {
        ...baseData,
        deliveryDate: 'January 15',
        trackingNumber: 'TRACK123',
      });

      expect(message).toContain('January 15');
      expect(message).toContain('TRACK123');
    });
  });

  describe('shouldSendNotification', () => {
    const basePrefs: NotificationPreferences = {
      patientId: 'PAT-001',
      smsEnabled: true,
      emailEnabled: true,
      phoneEnabled: true,
      appPushEnabled: true,
      preferredChannel: 'sms',
      phoneNumber: '555-1234',
      email: 'test@example.com',
      optedOutTypes: [],
    };

    it('should allow notification when enabled', () => {
      const result = shouldSendNotification(basePrefs, 'rx_ready', 'sms');

      expect(result.shouldSend).toBe(true);
    });

    it('should block notification when opted out', () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        optedOutTypes: ['rx_ready'],
      };

      const result = shouldSendNotification(prefs, 'rx_ready', 'sms');

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toContain('opted out');
    });

    it('should block SMS when disabled', () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        smsEnabled: false,
      };

      const result = shouldSendNotification(prefs, 'rx_ready', 'sms');

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toContain('SMS not enabled');
    });

    it('should block SMS when no phone number', () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        phoneNumber: undefined,
      };

      const result = shouldSendNotification(prefs, 'rx_ready', 'sms');

      expect(result.shouldSend).toBe(false);
    });

    it('should respect quiet hours', () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      // Test at 23:00
      const lateNight = new Date();
      lateNight.setHours(23, 0, 0, 0);

      const result = shouldSendNotification(prefs, 'rx_ready', 'sms', lateNight);

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toContain('quiet hours');
      expect(result.scheduleFor).toBeDefined();
    });

    it('should allow notifications outside quiet hours', () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      // Test at 14:00
      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);

      const result = shouldSendNotification(prefs, 'rx_ready', 'sms', afternoon);

      expect(result.shouldSend).toBe(true);
    });
  });

  describe('calculateReturnDate', () => {
    it('should calculate return date from placed date', () => {
      const placedAt = new Date();
      const result = calculateReturnDate(placedAt, 10);

      const expectedReturn = new Date(placedAt);
      expectedReturn.setDate(expectedReturn.getDate() + 10);

      expect(result.returnDate.toDateString()).toBe(expectedReturn.toDateString());
    });

    it('should calculate days remaining', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const result = calculateReturnDate(fiveDaysAgo, 10);

      expect(result.daysRemaining).toBe(5);
      expect(result.isOverdue).toBe(false);
    });

    it('should identify overdue items', () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const result = calculateReturnDate(fifteenDaysAgo, 10);

      expect(result.daysRemaining).toBe(0);
      expect(result.isOverdue).toBe(true);
    });
  });

  describe('getReadyForReturn', () => {
    it('should return items past return date', () => {
      const pastReturn = new Date();
      pastReturn.setDate(pastReturn.getDate() - 1);

      const futureReturn = new Date();
      futureReturn.setDate(futureReturn.getDate() + 5);

      const bins: WillCallBin[] = [
        createMockWillCallBin('1', pastReturn),
        createMockWillCallBin('2', futureReturn),
        createMockWillCallBin('3', pastReturn),
      ];

      const ready = getReadyForReturn(bins);

      expect(ready).toHaveLength(2);
    });
  });
});

// Helper functions
function createMockWorkflowItem(
  id: string,
  state: WorkflowState,
  priority: 'stat' | 'urgent' | 'normal' | 'low'
): WorkflowItem {
  return {
    id,
    prescriptionId: `RX-${id}`,
    rxNumber: `123456${id}`,
    patientId: 'PAT-001',
    patientName: 'Test Patient',
    drugName: 'Test Drug',
    strength: '10mg',
    quantity: 30,
    state,
    priority,
    isControlled: false,
    isRefrigerated: false,
    requiresCounseling: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    stateHistory: [],
  };
}

function createMockWillCallBin(id: string, returnToStockDate: Date): WillCallBin {
  return {
    binId: `BIN-${id}`,
    binLocation: 'A-01',
    prescriptionId: `RX-${id}`,
    rxNumber: `123456${id}`,
    patientName: 'Test Patient',
    drugName: 'Test Drug',
    quantity: 30,
    placedAt: new Date(),
    isRefrigerated: false,
    isControlled: false,
    daysInBin: 5,
    returnToStockDate,
  };
}
