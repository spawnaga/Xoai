import { describe, it, expect } from 'vitest';
import {
  CS_RULES,
  isValidDEANumber,
  generateTestDEANumber,
  recordCSTransaction,
  validateCSDispensing,
  calculateVariance,
  validateBiennialInventoryTiming,
  requiresDeaReport,
  generateDea106Summary,
  type TheftLossReport,
  type TheftLossItem,
} from './controlled-substances';

describe('Controlled Substances Module', () => {
  describe('CS_RULES', () => {
    it('should define rules for Schedule II', () => {
      const rules = CS_RULES['II'];

      expect(rules.refillsAllowed).toBe(0);
      expect(rules.prescriptionValidDays).toBe(90);
      expect(rules.requiresDEA222).toBe(true);
      expect(rules.arcosReporting).toBe(true);
      expect(rules.perpetualInventory).toBe(true);
    });

    it('should define rules for Schedule III-V', () => {
      const scheduleIII = CS_RULES['III'];
      const scheduleIV = CS_RULES['IV'];
      const scheduleV = CS_RULES['V'];

      expect(scheduleIII.refillsAllowed).toBe(5);
      expect(scheduleIV.refillsAllowed).toBe(5);
      expect(scheduleV.refillsAllowed).toBe(5);

      expect(scheduleIII.prescriptionValidDays).toBe(180);
      expect(scheduleIV.prescriptionValidDays).toBe(180);
      expect(scheduleV.prescriptionValidDays).toBe(180);

      expect(scheduleIII.requiresDEA222).toBe(false);
    });

    it('should define rules for Legend drugs', () => {
      const rules = CS_RULES['LEGEND'];

      expect(rules.refillsAllowed).toBe(11);
      expect(rules.perpetualInventory).toBe(false);
      expect(rules.arcosReporting).toBe(false);
    });

    it('should define rules for OTC', () => {
      const rules = CS_RULES['OTC'];

      expect(rules.refillsAllowed).toBe(99);
      expect(rules.perpetualInventory).toBe(false);
    });
  });

  describe('isValidDEANumber', () => {
    it('should validate correct DEA number with valid checksum', () => {
      // Generate a valid DEA number for testing
      const validDEA = generateTestDEANumber('A', 'Smith');
      expect(isValidDEANumber(validDEA)).toBe(true);
    });

    it('should reject DEA number with invalid format', () => {
      expect(isValidDEANumber('12345678')).toBe(false);
      expect(isValidDEANumber('A12345')).toBe(false);
      expect(isValidDEANumber('ABC1234567')).toBe(false);
    });

    it('should reject DEA number with invalid first letter', () => {
      // Valid first letters: A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, X
      // Invalid: I, N, O, Q, V, W, Y, Z
      expect(isValidDEANumber('IZ1234567')).toBe(false);
      expect(isValidDEANumber('NZ1234567')).toBe(false);
    });

    it('should reject DEA number with invalid checksum', () => {
      // AS1234561 - checksum should be different
      expect(isValidDEANumber('AS1234569')).toBe(false);
    });

    it('should validate DEA numbers case-insensitively', () => {
      const validDEA = generateTestDEANumber('A', 'Smith');
      expect(isValidDEANumber(validDEA.toLowerCase())).toBe(true);
    });
  });

  describe('generateTestDEANumber', () => {
    it('should generate valid DEA numbers', () => {
      for (let i = 0; i < 10; i++) {
        const dea = generateTestDEANumber();
        expect(isValidDEANumber(dea)).toBe(true);
      }
    });

    it('should use specified practitioner type', () => {
      const deaA = generateTestDEANumber('A', 'Smith');
      const deaB = generateTestDEANumber('B', 'Smith');
      const deaM = generateTestDEANumber('M', 'Smith');

      expect(deaA[0]).toBe('A');
      expect(deaB[0]).toBe('B');
      expect(deaM[0]).toBe('M');
    });

    it('should use specified last name initial', () => {
      const dea = generateTestDEANumber('A', 'Johnson');
      expect(dea[1]).toBe('J');
    });
  });

  describe('recordCSTransaction', () => {
    it('should record receive transaction with increased balance', () => {
      const record = recordCSTransaction(
        'PHARM-001',
        '12345678901',
        'Oxycodone 5mg',
        'II',
        'receive',
        100,
        50, // current balance
        'USER-001',
        'John Pharmacist'
      );

      expect(record.transactionType).toBe('receive');
      expect(record.quantity).toBe(100);
      expect(record.runningBalance).toBe(150);
      expect(record.deaSchedule).toBe('II');
    });

    it('should record dispense transaction with decreased balance', () => {
      const record = recordCSTransaction(
        'PHARM-001',
        '12345678901',
        'Oxycodone 5mg',
        'II',
        'dispense',
        30,
        100,
        'USER-001',
        'John Pharmacist'
      );

      expect(record.transactionType).toBe('dispense');
      expect(record.runningBalance).toBe(70);
    });

    it('should record destruction transaction', () => {
      const record = recordCSTransaction(
        'PHARM-001',
        '12345678901',
        'Oxycodone 5mg',
        'II',
        'destruction',
        10,
        100,
        'USER-001',
        'John Pharmacist',
        { destructionMethod: 'Incineration', witnessUserId: 'USER-002', witnessName: 'Jane Tech' }
      );

      expect(record.transactionType).toBe('destruction');
      expect(record.runningBalance).toBe(90);
      expect(record.destructionMethod).toBe('Incineration');
      expect(record.witnessUserId).toBe('USER-002');
    });

    it('should handle adjustment transactions', () => {
      const record = recordCSTransaction(
        'PHARM-001',
        '12345678901',
        'Oxycodone 5mg',
        'II',
        'adjustment',
        95, // new count
        100, // system count
        'USER-001',
        'John Pharmacist'
      );

      expect(record.runningBalance).toBe(95);
      expect(record.quantity).toBe(5); // Absolute difference
    });

    it('should not allow negative balance', () => {
      const record = recordCSTransaction(
        'PHARM-001',
        '12345678901',
        'Oxycodone 5mg',
        'II',
        'dispense',
        150,
        100,
        'USER-001',
        'John Pharmacist'
      );

      expect(record.runningBalance).toBe(0);
    });
  });

  describe('validateCSDispensing', () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const validDEA = generateTestDEANumber('A', 'Smith');

    it('should validate valid Schedule II dispensing', () => {
      const result = validateCSDispensing('II', thirtyDaysAgo, 0, false, validDEA);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.rules.schedule).toBe('II');
    });

    it('should reject Schedule I dispensing', () => {
      const result = validateCSDispensing('I', today, 0, false, validDEA);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Schedule I'))).toBe(true);
    });

    it('should reject expired Schedule II prescription', () => {
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const result = validateCSDispensing('II', ninetyOneDaysAgo, 0, false, validDEA);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expired'))).toBe(true);
    });

    it('should reject Schedule II refills', () => {
      const result = validateCSDispensing('II', thirtyDaysAgo, 1, false, validDEA);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot be refilled'))).toBe(true);
    });

    it('should validate Schedule III-V with refills', () => {
      const result = validateCSDispensing('III', thirtyDaysAgo, 3, false, validDEA);

      expect(result.valid).toBe(true);
    });

    it('should reject exceeding refill limit', () => {
      const result = validateCSDispensing('IV', thirtyDaysAgo, 6, false, validDEA);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Refill limit'))).toBe(true);
    });

    it('should require prescriber DEA', () => {
      const result = validateCSDispensing('II', thirtyDaysAgo, 0, false);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DEA number required'))).toBe(true);
    });

    it('should warn for invalid DEA format', () => {
      const result = validateCSDispensing('II', thirtyDaysAgo, 0, false, 'INVALID');

      expect(result.warnings.some(w => w.includes('invalid'))).toBe(true);
    });

    it('should warn about EPCS verification for Schedule II', () => {
      const result = validateCSDispensing('II', thirtyDaysAgo, 0, false, validDEA);

      expect(result.warnings.some(w => w.includes('EPCS'))).toBe(true);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate zero variance', () => {
      const result = calculateVariance(100, 100);

      expect(result.variance).toBe(0);
      expect(result.variancePercent).toBe(0);
      expect(result.severity).toBe('none');
      expect(result.requiresInvestigation).toBe(false);
    });

    it('should calculate minor variance (<=1%)', () => {
      const result = calculateVariance(99, 100);

      expect(result.variance).toBe(-1);
      expect(result.variancePercent).toBe(-1);
      expect(result.severity).toBe('minor');
      expect(result.requiresInvestigation).toBe(false);
    });

    it('should calculate significant variance (1-5%)', () => {
      const result = calculateVariance(97, 100);

      expect(result.variance).toBe(-3);
      expect(result.variancePercent).toBe(-3);
      expect(result.severity).toBe('significant');
      expect(result.requiresInvestigation).toBe(true);
    });

    it('should calculate critical variance (>5%)', () => {
      const result = calculateVariance(90, 100);

      expect(result.variance).toBe(-10);
      expect(result.variancePercent).toBe(-10);
      expect(result.severity).toBe('critical');
      expect(result.requiresInvestigation).toBe(true);
      expect(result.requiresDeaReport).toBe(true);
    });

    it('should handle positive variance', () => {
      const result = calculateVariance(110, 100);

      expect(result.variance).toBe(10);
      expect(result.severity).toBe('critical');
      expect(result.requiresDeaReport).toBe(false); // Only negative requires DEA
    });
  });

  describe('validateBiennialInventoryTiming', () => {
    it('should return current status for recent inventory', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

      const result = validateBiennialInventoryTiming(sixMonthsAgo);

      expect(result.status).toBe('current');
      expect(result.isOverdue).toBe(false);
      expect(result.isDueSoon).toBe(false);
    });

    it('should return due_soon status within 30 days', () => {
      const almostTwoYearsAgo = new Date();
      almostTwoYearsAgo.setDate(almostTwoYearsAgo.getDate() - 710); // 20 days from due

      const result = validateBiennialInventoryTiming(almostTwoYearsAgo);

      expect(result.status).toBe('due_soon');
      expect(result.isDueSoon).toBe(true);
    });

    it('should return overdue status past 2 years', () => {
      const overTwoYearsAgo = new Date();
      overTwoYearsAgo.setDate(overTwoYearsAgo.getDate() - 740);

      const result = validateBiennialInventoryTiming(overTwoYearsAgo);

      expect(result.status).toBe('overdue');
      expect(result.isOverdue).toBe(true);
    });

    it('should calculate days until due', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const result = validateBiennialInventoryTiming(oneYearAgo);

      expect(result.daysUntilDue).toBeGreaterThan(360);
      expect(result.daysUntilDue).toBeLessThan(370);
    });
  });

  describe('requiresDeaReport', () => {
    it('should return true for Schedule II-V losses', () => {
      const items: TheftLossItem[] = [
        {
          ndc: '12345678901',
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantityLost: 100,
          unit: 'EA',
          strength: '5mg',
          dosageForm: 'Tablet',
        },
      ];

      expect(requiresDeaReport(items)).toBe(true);
    });

    it('should return false for non-controlled losses', () => {
      const items: TheftLossItem[] = [
        {
          ndc: '12345678901',
          drugName: 'Lisinopril',
          deaSchedule: 'LEGEND' as any, // Force type for test
          quantityLost: 100,
          unit: 'EA',
          strength: '10mg',
          dosageForm: 'Tablet',
        },
      ];

      expect(requiresDeaReport(items)).toBe(false);
    });

    it('should return true if any item is controlled', () => {
      const items: TheftLossItem[] = [
        {
          ndc: '12345678901',
          drugName: 'Lisinopril',
          deaSchedule: 'LEGEND' as any,
          quantityLost: 100,
          unit: 'EA',
          strength: '10mg',
          dosageForm: 'Tablet',
        },
        {
          ndc: '12345678902',
          drugName: 'Alprazolam',
          deaSchedule: 'IV',
          quantityLost: 50,
          unit: 'EA',
          strength: '1mg',
          dosageForm: 'Tablet',
        },
      ];

      expect(requiresDeaReport(items)).toBe(true);
    });
  });

  describe('generateDea106Summary', () => {
    it('should generate summary from theft report', () => {
      const report: TheftLossReport = {
        id: 'THEFT-001',
        pharmacyId: 'PHARM-001',
        pharmacyDeaNumber: 'AS1234563',
        reportDate: new Date(),
        discoveryDate: new Date(),
        incidentType: 'theft',
        items: [
          {
            ndc: '12345678901',
            drugName: 'Oxycodone',
            deaSchedule: 'II',
            quantityLost: 100,
            unit: 'EA',
            strength: '5mg',
            dosageForm: 'Tablet',
          },
          {
            ndc: '12345678902',
            drugName: 'Alprazolam',
            deaSchedule: 'IV',
            quantityLost: 200,
            unit: 'EA',
            strength: '1mg',
            dosageForm: 'Tablet',
          },
        ],
        totalQuantityLost: 300,
        description: 'Test theft',
        circumstances: 'Test circumstances',
        securityMeasures: 'Test measures',
        reportedBy: 'Test User',
        status: 'draft',
        createdAt: new Date(),
      };

      const summary = generateDea106Summary(report);

      expect(summary.pharmacyDeaNumber).toBe('AS1234563');
      expect(summary.incidentType).toBe('theft');
      expect(summary.totalItemsAffected).toBe(2);
      expect(summary.totalQuantityLost).toBe(300);
      expect(summary.scheduleBreakdown['Schedule II']).toBe(100);
      expect(summary.scheduleBreakdown['Schedule IV']).toBe(200);
      expect(summary.mustReportWithin).toContain('1 business day');
    });
  });
});
