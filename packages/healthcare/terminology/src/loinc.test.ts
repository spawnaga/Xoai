import { describe, it, expect } from 'vitest';
import { lookupLOINC, searchLOINC, VITAL_SIGN_LOINC } from './loinc';

describe('LOINC Terminology', () => {
  describe('lookupLOINC', () => {
    it('should find known LOINC code', () => {
      const result = lookupLOINC('8480-6');

      expect(result).toBeDefined();
      expect(result?.code).toBe('8480-6');
      expect(result?.display).toContain('Systolic blood pressure');
      expect(result?.system).toBe('http://loinc.org');
    });

    it('should find common lab codes', () => {
      const glucose = lookupLOINC('2345-7');
      expect(glucose?.display).toContain('Glucose');

      const hba1c = lookupLOINC('4548-4');
      expect(hba1c?.display).toContain('Hemoglobin A1c');

      const creatinine = lookupLOINC('2160-0');
      expect(creatinine?.display).toContain('Creatinine');
    });

    it('should include LOINC properties', () => {
      const result = lookupLOINC('8480-6');

      expect(result?.component).toBe('Systolic blood pressure');
      expect(result?.property).toBe('Pres');
      expect(result?.scale).toBe('Qn');
    });

    it('should return undefined for unknown code', () => {
      const result = lookupLOINC('99999-9');

      expect(result).toBeUndefined();
    });
  });

  describe('searchLOINC', () => {
    it('should find codes by description', () => {
      const results = searchLOINC('blood pressure');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.code === '8480-6')).toBe(true);
      expect(results.some((r) => r.code === '8462-4')).toBe(true);
    });

    it('should search by component', () => {
      const results = searchLOINC('glucose');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.component).toContain('Glucose');
    });

    it('should be case insensitive', () => {
      const results1 = searchLOINC('HEART RATE');
      const results2 = searchLOINC('heart rate');

      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchLOINC('xyznonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('VITAL_SIGN_LOINC', () => {
    it('should have correct LOINC codes for vital signs', () => {
      expect(VITAL_SIGN_LOINC.SYSTOLIC_BP).toBe('8480-6');
      expect(VITAL_SIGN_LOINC.DIASTOLIC_BP).toBe('8462-4');
      expect(VITAL_SIGN_LOINC.HEART_RATE).toBe('8867-4');
      expect(VITAL_SIGN_LOINC.TEMPERATURE).toBe('8310-5');
      expect(VITAL_SIGN_LOINC.WEIGHT).toBe('29463-7');
      expect(VITAL_SIGN_LOINC.HEIGHT).toBe('8302-2');
    });

    it('should have valid LOINC codes that can be looked up', () => {
      const systolic = lookupLOINC(VITAL_SIGN_LOINC.SYSTOLIC_BP);
      expect(systolic).toBeDefined();

      const heartRate = lookupLOINC(VITAL_SIGN_LOINC.HEART_RATE);
      expect(heartRate).toBeDefined();

      const weight = lookupLOINC(VITAL_SIGN_LOINC.WEIGHT);
      expect(weight).toBeDefined();
    });
  });
});
