import { describe, it, expect } from 'vitest';
import { lookupRxNorm, searchRxNorm, getRxNormByName } from './rxnorm';

describe('RxNorm Terminology', () => {
  describe('lookupRxNorm', () => {
    it('should find known RxNorm code', () => {
      const result = lookupRxNorm('197884');

      expect(result).toBeDefined();
      expect(result?.code).toBe('197884');
      expect(result?.display).toBe('Lisinopril');
      expect(result?.system).toBe('http://www.nlm.nih.gov/research/umls/rxnorm');
    });

    it('should find common medications', () => {
      const aspirin = lookupRxNorm('1191');
      expect(aspirin?.display).toBe('Aspirin');

      const ibuprofen = lookupRxNorm('5640');
      expect(ibuprofen?.display).toBe('Ibuprofen');

      const metformin = lookupRxNorm('6809');
      expect(metformin?.display).toBe('Metformin');
    });

    it('should return undefined for unknown code', () => {
      const result = lookupRxNorm('9999999');

      expect(result).toBeUndefined();
    });

    it('should include term type', () => {
      const result = lookupRxNorm('161');

      expect(result?.tty).toBe('IN');
    });
  });

  describe('searchRxNorm', () => {
    it('should find medications by name', () => {
      const results = searchRxNorm('aspirin');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.display).toBe('Aspirin');
    });

    it('should be case insensitive', () => {
      const results1 = searchRxNorm('LISINOPRIL');
      const results2 = searchRxNorm('lisinopril');

      expect(results1.length).toBe(results2.length);
    });

    it('should find partial matches', () => {
      const results = searchRxNorm('statin');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.display.toLowerCase().includes('statin'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = searchRxNorm('xyznonexistentdrug');

      expect(results).toHaveLength(0);
    });
  });

  describe('getRxNormByName', () => {
    it('should find medication by exact name', () => {
      const result = getRxNormByName('Aspirin');

      expect(result).toBeDefined();
      expect(result?.code).toBe('1191');
    });

    it('should be case insensitive', () => {
      const result1 = getRxNormByName('aspirin');
      const result2 = getRxNormByName('ASPIRIN');

      expect(result1?.code).toBe(result2?.code);
    });

    it('should return undefined for non-exact match', () => {
      const result = getRxNormByName('Aspirin 325mg');

      expect(result).toBeUndefined();
    });

    it('should return undefined for unknown medication', () => {
      const result = getRxNormByName('UnknownDrug');

      expect(result).toBeUndefined();
    });
  });
});
