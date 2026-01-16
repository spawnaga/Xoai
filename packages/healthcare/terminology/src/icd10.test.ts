import { describe, it, expect } from 'vitest';
import {
  lookupICD10,
  searchICD10,
  isValidICD10Format,
  getICD10Category,
} from './icd10';

describe('ICD-10 Terminology', () => {
  describe('lookupICD10', () => {
    it('should find known ICD-10 code', () => {
      const result = lookupICD10('I10');

      expect(result).toBeDefined();
      expect(result?.code).toBe('I10');
      expect(result?.display).toBe('Essential (primary) hypertension');
      expect(result?.system).toBe('http://hl7.org/fhir/sid/icd-10-cm');
      expect(result?.billable).toBe(true);
    });

    it('should find code with decimal', () => {
      const result = lookupICD10('E11.9');

      expect(result).toBeDefined();
      expect(result?.code).toBe('E11.9');
      expect(result?.display).toContain('Type 2 diabetes');
    });

    it('should be case insensitive', () => {
      const result1 = lookupICD10('i10');
      const result2 = lookupICD10('I10');

      expect(result1?.code).toBe(result2?.code);
    });

    it('should return undefined for unknown code', () => {
      const result = lookupICD10('UNKNOWN');

      expect(result).toBeUndefined();
    });
  });

  describe('searchICD10', () => {
    it('should find codes by description', () => {
      const results = searchICD10('diabetes');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.code === 'E11.9')).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchICD10('HYPERTENSION');
      const results2 = searchICD10('hypertension');

      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchICD10('xyznonexistent');

      expect(results).toHaveLength(0);
    });

    it('should find multiple matching codes', () => {
      const results = searchICD10('pain');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('isValidICD10Format', () => {
    it('should validate correct 3-character code', () => {
      expect(isValidICD10Format('I10')).toBe(true);
      expect(isValidICD10Format('J06')).toBe(true);
      expect(isValidICD10Format('R05')).toBe(true);
    });

    it('should validate code with decimal', () => {
      expect(isValidICD10Format('E11.9')).toBe(true);
      expect(isValidICD10Format('J06.9')).toBe(true);
      expect(isValidICD10Format('M54.5')).toBe(true);
    });

    it('should validate extended codes', () => {
      expect(isValidICD10Format('S72.001A')).toBe(true);
      expect(isValidICD10Format('Z00.00')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidICD10Format('10')).toBe(false);
      expect(isValidICD10Format('INVALID')).toBe(false);
      expect(isValidICD10Format('123')).toBe(false);
      expect(isValidICD10Format('')).toBe(false);
    });
  });

  describe('getICD10Category', () => {
    it('should extract category from simple code', () => {
      expect(getICD10Category('I10')).toBe('I10');
    });

    it('should extract category from code with decimal', () => {
      expect(getICD10Category('E11.9')).toBe('E11');
      expect(getICD10Category('J06.9')).toBe('J06');
    });

    it('should extract category from extended code', () => {
      expect(getICD10Category('S72.001A')).toBe('S72');
    });
  });
});
