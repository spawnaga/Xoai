import { describe, it, expect } from 'vitest';
import { calculatePatientPay, parseRejectCodes, DAW_CODES } from '@xoai/medscab/claims';

describe('Claims Processing', () => {
  describe('calculatePatientPay', () => {
    it('calculates copay only', () => {
      const result = calculatePatientPay(100, 80, 20, 0, 0);
      expect(result.patientPay).toBe(20);
      expect(result.breakdown.copay).toBe(20);
    });

    it('applies deductible first', () => {
      const result = calculatePatientPay(100, 50, 10, 30, 0);
      expect(result.breakdown.deductible).toBe(30);
      expect(result.patientPay).toBeGreaterThan(30);
    });

    it('applies coinsurance', () => {
      const result = calculatePatientPay(100, 70, 0, 0, 20);
      expect(result.breakdown.coinsurance).toBeGreaterThan(0);
    });
  });

  describe('parseRejectCodes', () => {
    it('parses known codes', () => {
      const codes = parseRejectCodes(['70', '75']);
      expect(codes.length).toBe(2);
      expect(codes[0]?.code).toBe('70');
      expect(codes[1]?.code).toBe('75');
    });

    it('handles unknown codes', () => {
      const codes = parseRejectCodes(['999']);
      expect(codes.length).toBe(1);
      expect(codes[0]?.description).toContain('Unknown');
    });
  });

  describe('DAW_CODES', () => {
    it('has standard codes', () => {
      expect(DAW_CODES[0]).toContain('No Product Selection');
      expect(DAW_CODES[1]).toContain('Substitution Not Allowed');
    });
  });
});
