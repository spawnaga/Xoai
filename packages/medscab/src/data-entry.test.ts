import { describe, it, expect } from 'vitest';
import {
  DAW_CODES,
  SIG_COMPONENTS,
  buildSig,
  validateDataEntry,
  formatNdcDisplay,
  normalizeNdc,
  isValidNdc,
  isValidNpi,
  isValidDeaNumber,
  calculateDaysSupply,
  frequencyToDosesPerDay,
  type DataEntryInput,
  type SigComponents,
} from './data-entry';

describe('Data Entry Module', () => {
  describe('DAW_CODES', () => {
    it('should define all 10 DAW codes (0-9)', () => {
      expect(Object.keys(DAW_CODES)).toHaveLength(10);
      expect(DAW_CODES[0]).toBeDefined();
      expect(DAW_CODES[9]).toBeDefined();
    });

    it('should have correct description for DAW 0', () => {
      expect(DAW_CODES[0]?.description).toBe('No Product Selection Indicated');
    });

    it('should have correct description for DAW 1', () => {
      expect(DAW_CODES[1]?.description).toBe('Substitution Not Allowed by Prescriber');
    });

    it('should have correct description for DAW 2', () => {
      expect(DAW_CODES[2]?.description).toContain('Patient Requested');
    });
  });

  describe('SIG_COMPONENTS', () => {
    it('should define action verbs', () => {
      expect(SIG_COMPONENTS.actions.length).toBeGreaterThan(0);
      expect(SIG_COMPONENTS.actions.find(a => a.code === 'TAKE')).toBeDefined();
      expect(SIG_COMPONENTS.actions.find(a => a.code === 'APPLY')).toBeDefined();
    });

    it('should define dose quantities', () => {
      expect(SIG_COMPONENTS.quantities.length).toBeGreaterThan(0);
      expect(SIG_COMPONENTS.quantities.find(q => q.code === '1')).toBeDefined();
    });

    it('should define dose forms', () => {
      expect(SIG_COMPONENTS.forms.find(f => f.code === 'TAB')).toBeDefined();
      expect(SIG_COMPONENTS.forms.find(f => f.code === 'CAP')).toBeDefined();
    });

    it('should define routes of administration', () => {
      expect(SIG_COMPONENTS.routes.find(r => r.code === 'PO')).toBeDefined();
      expect(SIG_COMPONENTS.routes.find(r => r.code === 'TOP')).toBeDefined();
    });

    it('should define frequencies', () => {
      expect(SIG_COMPONENTS.frequencies.find(f => f.code === 'QD')).toBeDefined();
      expect(SIG_COMPONENTS.frequencies.find(f => f.code === 'BID')).toBeDefined();
      expect(SIG_COMPONENTS.frequencies.find(f => f.code === 'PRN')).toBeDefined();
    });
  });

  describe('buildSig', () => {
    it('should build basic SIG text', () => {
      const components: SigComponents = {
        action: 'TAKE',
        quantity: '1',
        form: 'TAB',
        route: 'PO',
        frequency: 'QD',
      };

      const sig = buildSig(components);

      expect(sig).toBe('Take one tablet(s) by mouth once daily');
    });

    it('should include timing when provided', () => {
      const components: SigComponents = {
        action: 'TAKE',
        quantity: '1',
        form: 'TAB',
        route: 'PO',
        frequency: 'BID',
        timing: 'WF',
      };

      const sig = buildSig(components);

      expect(sig).toContain('with food');
    });

    it('should include PRN reason when provided', () => {
      const components: SigComponents = {
        action: 'TAKE',
        quantity: '1',
        form: 'TAB',
        route: 'PO',
        frequency: 'PRN',
        prnReason: 'PAIN',
      };

      const sig = buildSig(components);

      expect(sig).toContain('for pain');
    });

    it('should include duration when provided', () => {
      const components: SigComponents = {
        action: 'TAKE',
        quantity: '1',
        form: 'CAP',
        route: 'PO',
        frequency: 'TID',
        duration: 'X7D',
      };

      const sig = buildSig(components);

      expect(sig).toContain('for 7 days');
    });

    it('should use custom dose when provided', () => {
      const components: SigComponents = {
        action: 'INJECT',
        customDose: '40 units',
        route: 'SC',
        frequency: 'QD',
      };

      const sig = buildSig(components);

      expect(sig).toContain('40 units');
    });
  });

  describe('validateDataEntry', () => {
    it('should require patient ID', () => {
      const data: DataEntryInput = {
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.find(e => e.field === 'patientId')).toBeDefined();
    });

    it('should require prescriber ID', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.find(e => e.field === 'prescriberId')).toBeDefined();
    });

    it('should require drug selection', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.find(e => e.field === 'drug')).toBeDefined();
    });

    it('should validate quantity is positive', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 0,
        daysSupply: 30,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.field === 'quantity')).toBeDefined();
    });

    it('should warn on unusually high quantity', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 10000,
        daysSupply: 30,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.warnings.find(w => w.code === 'HIGH_QUANTITY')).toBeDefined();
    });

    it('should validate days supply range', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 400,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.field === 'daysSupply')).toBeDefined();
    });

    it('should warn on days supply over 90', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 100,
        daysSupply: 100,
        directions: 'Take one tablet daily',
      };

      const result = validateDataEntry(data);

      expect(result.warnings.find(w => w.code === 'LONG_SUPPLY')).toBeDefined();
    });

    it('should require directions', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: '',
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.field === 'directions')).toBeDefined();
    });

    it('should error on C2 with refills', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
        deaSchedule: 2,
        refills: 1,
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.code === 'C2_NO_REFILLS')).toBeDefined();
    });

    it('should error on C3-C5 with more than 5 refills', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
        deaSchedule: 3,
        refills: 6,
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.code === 'CS_REFILL_LIMIT')).toBeDefined();
    });

    it('should validate DAW code range', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
        dawCode: 15,
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.field === 'dawCode')).toBeDefined();
    });

    it('should error on future written date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
        writtenDate: futureDate,
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.code === 'FUTURE_DATE')).toBeDefined();
    });

    it('should error on C2 prescription older than 90 days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet daily',
        deaSchedule: 2,
        writtenDate: oldDate,
      };

      const result = validateDataEntry(data);

      expect(result.errors.find(e => e.code === 'C2_EXPIRED')).toBeDefined();
    });

    it('should pass valid data entry', () => {
      const data: DataEntryInput = {
        patientId: 'PAT-001',
        prescriberId: 'PRES-001',
        drugNdc: '12345678901',
        quantity: 30,
        daysSupply: 30,
        directions: 'Take one tablet by mouth once daily',
        refills: 3,
        dawCode: 0,
      };

      const result = validateDataEntry(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('formatNdcDisplay', () => {
    it('should format 11-digit NDC to 5-4-2 format', () => {
      expect(formatNdcDisplay('12345678901')).toBe('12345-6789-01');
    });

    it('should handle NDC with dashes', () => {
      expect(formatNdcDisplay('12345-6789-01')).toBe('12345-6789-01');
    });

    it('should pad short NDC', () => {
      expect(formatNdcDisplay('1234567890')).toBe('01234-5678-90');
    });
  });

  describe('normalizeNdc', () => {
    it('should remove dashes and pad to 11 digits', () => {
      expect(normalizeNdc('12345-6789-01')).toBe('12345678901');
    });

    it('should pad short NDC', () => {
      expect(normalizeNdc('1234567890')).toBe('01234567890');
    });
  });

  describe('isValidNdc', () => {
    it('should accept 11-digit NDC', () => {
      expect(isValidNdc('12345678901')).toBe(true);
    });

    it('should accept 10-digit NDC', () => {
      expect(isValidNdc('1234567890')).toBe(true);
    });

    it('should reject NDC with wrong length', () => {
      expect(isValidNdc('12345')).toBe(false);
      expect(isValidNdc('123456789012')).toBe(false);
    });

    it('should accept NDC with dashes', () => {
      expect(isValidNdc('12345-6789-01')).toBe(true);
    });
  });

  describe('isValidNpi', () => {
    it('should validate correct NPI with Luhn check', () => {
      // Valid NPI: 1234567893
      expect(isValidNpi('1234567893')).toBe(true);
    });

    it('should reject incorrect NPI', () => {
      expect(isValidNpi('1234567890')).toBe(false);
    });

    it('should reject NPI with wrong length', () => {
      expect(isValidNpi('12345')).toBe(false);
      expect(isValidNpi('12345678901')).toBe(false);
    });
  });

  describe('isValidDeaNumber', () => {
    it('should validate correct DEA number format and checksum', () => {
      // Valid DEA: AB1234563 (checksum calculation)
      // Odds: 1 + 3 + 5 = 9
      // Evens: (2 + 4 + 6) * 2 = 24
      // Sum: 33, check digit: 3
      expect(isValidDeaNumber('AB1234563')).toBe(true);
    });

    it('should reject DEA with incorrect checksum', () => {
      expect(isValidDeaNumber('AB1234560')).toBe(false);
    });

    it('should reject DEA with wrong length', () => {
      expect(isValidDeaNumber('AB123')).toBe(false);
    });

    it('should reject DEA with invalid format', () => {
      expect(isValidDeaNumber('123456789')).toBe(false);
    });
  });

  describe('calculateDaysSupply', () => {
    it('should calculate days supply correctly', () => {
      expect(calculateDaysSupply(30, 1, 1)).toBe(30); // 30 tabs / 1 tab daily = 30 days
      expect(calculateDaysSupply(60, 2, 1)).toBe(30); // 60 tabs / 2 tabs daily = 30 days
      expect(calculateDaysSupply(90, 3, 1)).toBe(30); // 90 tabs / 3 tabs daily = 30 days
    });

    it('should handle fractional doses', () => {
      expect(calculateDaysSupply(30, 1, 0.5)).toBe(60); // 30 tabs / 0.5 tab daily = 60 days
    });

    it('should return 0 for invalid input', () => {
      expect(calculateDaysSupply(30, 0, 1)).toBe(0);
      expect(calculateDaysSupply(30, 1, 0)).toBe(0);
    });
  });

  describe('frequencyToDosesPerDay', () => {
    it('should convert QD to 1', () => {
      expect(frequencyToDosesPerDay('QD')).toBe(1);
    });

    it('should convert BID to 2', () => {
      expect(frequencyToDosesPerDay('BID')).toBe(2);
    });

    it('should convert TID to 3', () => {
      expect(frequencyToDosesPerDay('TID')).toBe(3);
    });

    it('should convert QID to 4', () => {
      expect(frequencyToDosesPerDay('QID')).toBe(4);
    });

    it('should convert Q4H to 6', () => {
      expect(frequencyToDosesPerDay('Q4H')).toBe(6);
    });

    it('should convert QOD to 0.5', () => {
      expect(frequencyToDosesPerDay('QOD')).toBe(0.5);
    });

    it('should handle lowercase input', () => {
      expect(frequencyToDosesPerDay('qd')).toBe(1);
      expect(frequencyToDosesPerDay('bid')).toBe(2);
    });

    it('should default to 1 for unknown frequency', () => {
      expect(frequencyToDosesPerDay('UNKNOWN')).toBe(1);
    });
  });
});
