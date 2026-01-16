import { describe, it, expect } from 'vitest';
import {
  validateNDCFormat,
  normalizeNDC,
  formatNDC,
  searchNDC,
  lookupNDC,
  getNDCSchedule,
  isControlledSubstance,
  ndcToCodeableConcept,
  NDCLookupService,
  NDC_SYSTEM,
} from './ndc';

describe('NDC Terminology', () => {
  describe('validateNDCFormat', () => {
    it('should validate 4-4-2 format', () => {
      expect(validateNDCFormat('1234-5678-90')).toBe(true);
    });

    it('should validate 5-3-2 format', () => {
      expect(validateNDCFormat('12345-678-90')).toBe(true);
    });

    it('should validate 5-4-1 format', () => {
      expect(validateNDCFormat('12345-6789-0')).toBe(true);
    });

    it('should validate 5-4-2 format (11-digit)', () => {
      expect(validateNDCFormat('12345-6789-01')).toBe(true);
    });

    it('should validate 10-digit format without dashes', () => {
      expect(validateNDCFormat('1234567890')).toBe(true);
    });

    it('should validate 11-digit format without dashes', () => {
      expect(validateNDCFormat('12345678901')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateNDCFormat('123')).toBe(false);
      expect(validateNDCFormat('abc-defg-hi')).toBe(false);
      expect(validateNDCFormat('')).toBe(false);
      expect(validateNDCFormat('12345678901234')).toBe(false);
    });
  });

  describe('normalizeNDC', () => {
    it('should normalize 10-digit to 11-digit by adding leading zero', () => {
      expect(normalizeNDC('1234567890')).toBe('01234567890');
    });

    it('should keep 11-digit unchanged', () => {
      expect(normalizeNDC('12345678901')).toBe('12345678901');
    });

    it('should remove dashes and normalize', () => {
      expect(normalizeNDC('1234-5678-90')).toBe('01234567890');
      expect(normalizeNDC('12345-6789-01')).toBe('12345678901');
    });
  });

  describe('formatNDC', () => {
    it('should format 11-digit as 5-4-2', () => {
      expect(formatNDC('12345678901')).toBe('12345-6789-01');
    });

    it('should normalize 10-digit then format', () => {
      expect(formatNDC('1234567890')).toBe('01234-5678-90');
    });

    it('should handle already formatted input', () => {
      expect(formatNDC('12345-6789-01')).toBe('12345-6789-01');
    });

    it('should return original for invalid length', () => {
      expect(formatNDC('123')).toBe('123');
    });
  });

  describe('searchNDC', () => {
    it('should find NDC by product name', () => {
      const results = searchNDC('lisinopril');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].display.toLowerCase()).toContain('lisinopril');
    });

    it('should find NDC by labeler name', () => {
      const results = searchNDC('Eli Lilly');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].labeler).toContain('Eli Lilly');
    });

    it('should be case-insensitive', () => {
      const results1 = searchNDC('METFORMIN');
      const results2 = searchNDC('metformin');
      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchNDC('xyznonexistentdrug');
      expect(results).toHaveLength(0);
    });

    it('should include schedule for controlled substances', () => {
      const results = searchNDC('hydrocodone');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schedule).toBe('CII');
    });
  });

  describe('lookupNDC', () => {
    it('should find NDC by code', () => {
      const result = lookupNDC('0006-0749-31');
      expect(result).toBeDefined();
      expect(result?.productName).toBe('Lisinopril');
    });

    it('should find NDC with normalized code', () => {
      // 0006-0749-31 is 10 digits (4-4-2), normalizes to 00006074931 (leading zero added)
      const result = lookupNDC('00006074931');
      expect(result).toBeDefined();
      expect(result?.productName).toBe('Lisinopril');
    });

    it('should return undefined for unknown code', () => {
      const result = lookupNDC('99999-9999-99');
      expect(result).toBeUndefined();
    });

    it('should include all NDC properties', () => {
      const result = lookupNDC('0002-3227-30');
      expect(result).toBeDefined();
      expect(result?.labelerName).toBeDefined();
      expect(result?.dosageForm).toBeDefined();
      expect(result?.route).toBeDefined();
      expect(result?.strength).toBeDefined();
    });
  });

  describe('getNDCSchedule', () => {
    it('should return schedule for controlled substance', () => {
      const schedule = getNDCSchedule('0093-0089-01');
      expect(schedule).toBe('CII');
    });

    it('should return undefined for non-controlled substance', () => {
      const schedule = getNDCSchedule('0006-0749-31');
      expect(schedule).toBeUndefined();
    });

    it('should return undefined for unknown NDC', () => {
      const schedule = getNDCSchedule('99999-9999-99');
      expect(schedule).toBeUndefined();
    });
  });

  describe('isControlledSubstance', () => {
    it('should return true for controlled substance', () => {
      expect(isControlledSubstance('0093-0089-01')).toBe(true);
    });

    it('should return false for non-controlled substance', () => {
      expect(isControlledSubstance('0006-0749-31')).toBe(false);
    });

    it('should return false for unknown NDC', () => {
      expect(isControlledSubstance('99999-9999-99')).toBe(false);
    });
  });

  describe('ndcToCodeableConcept', () => {
    it('should create CodeableConcept for known NDC', () => {
      const result = ndcToCodeableConcept('0006-0749-31');

      expect(result.coding).toHaveLength(1);
      expect(result.coding[0].system).toBe(NDC_SYSTEM);
      expect(result.coding[0].code).toBeDefined();
      expect(result.coding[0].display).toBe('Lisinopril');
      expect(result.text).toContain('Lisinopril');
    });

    it('should create CodeableConcept for unknown NDC', () => {
      const result = ndcToCodeableConcept('99999-9999-99');

      expect(result.coding).toHaveLength(1);
      expect(result.coding[0].system).toBe(NDC_SYSTEM);
      expect(result.coding[0].display).toBeUndefined();
      expect(result.text).toBeUndefined();
    });

    it('should format NDC code in result', () => {
      const result = ndcToCodeableConcept('12345678901');
      expect(result.coding[0].code).toBe('12345-6789-01');
    });
  });

  describe('NDC_SYSTEM', () => {
    it('should be the correct HL7 FHIR NDC system URI', () => {
      expect(NDC_SYSTEM).toBe('http://hl7.org/fhir/sid/ndc');
    });
  });

  describe('NDCLookupService', () => {
    it('should create service with default URL', () => {
      const service = new NDCLookupService();
      expect(service).toBeDefined();
    });

    it('should create service with custom URL', () => {
      const service = new NDCLookupService('https://custom-api.com');
      expect(service).toBeDefined();
    });

    it('should fall back to local search when FDA API fails', async () => {
      const service = new NDCLookupService('https://invalid-url.example.com');
      const results = await service.searchFDA('lisinopril');

      // Should fall back to local searchNDC
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
