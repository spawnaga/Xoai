import { describe, it, expect } from 'vitest';
import { validateDataEntry, buildSig, DAW_CODES } from '@xoai/medscab/data-entry';

describe('Data Entry Router', () => {
  describe('validateDataEntry', () => {
    it('validates required fields', () => {
      const result = validateDataEntry({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validates quantity', () => {
      const result = validateDataEntry({ quantity: -1 });
      expect(result.errors.some(e => e.field === 'quantity')).toBe(true);
    });

    it('validates C2 refills', () => {
      const result = validateDataEntry({ deaSchedule: 2, refills: 1 });
      expect(result.errors.some(e => e.code === 'C2_NO_REFILLS')).toBe(true);
    });
  });

  describe('buildSig', () => {
    it('builds basic sig', () => {
      const sig = buildSig({
        action: 'TAKE',
        quantity: '1',
        form: 'TAB',
        route: 'PO',
        frequency: 'BID',
      });
      expect(sig).toContain('Take');
      expect(sig).toContain('tablet');
      expect(sig).toContain('twice daily');
    });
  });

  describe('DAW_CODES', () => {
    it('has all codes 0-9', () => {
      expect(Object.keys(DAW_CODES).length).toBe(10);
      expect(DAW_CODES[0]).toBeDefined();
      expect(DAW_CODES[9]).toBeDefined();
    });
  });
});
