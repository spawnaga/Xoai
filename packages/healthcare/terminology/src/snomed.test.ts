import { describe, it, expect } from 'vitest';
import { lookupSNOMED, searchSNOMED, getSNOMEDExpression } from './snomed';

describe('SNOMED CT Terminology', () => {
  describe('lookupSNOMED', () => {
    it('should find known SNOMED code', () => {
      const result = lookupSNOMED('386661006');

      expect(result).toBeDefined();
      expect(result?.code).toBe('386661006');
      expect(result?.display).toBe('Fever');
      expect(result?.system).toBe('http://snomed.info/sct');
    });

    it('should find common clinical findings', () => {
      const cough = lookupSNOMED('49727002');
      expect(cough?.display).toBe('Cough');

      const headache = lookupSNOMED('25064002');
      expect(headache?.display).toBe('Headache');

      const dyspnea = lookupSNOMED('267036007');
      expect(dyspnea?.display).toBe('Dyspnea');
    });

    it('should find common disorders', () => {
      const diabetes = lookupSNOMED('73211009');
      expect(diabetes?.display).toBe('Diabetes mellitus');

      const hypertension = lookupSNOMED('38341003');
      expect(hypertension?.display).toBe('Hypertensive disorder');

      const asthma = lookupSNOMED('195967001');
      expect(asthma?.display).toBe('Asthma');
    });

    it('should include FSN (Fully Specified Name)', () => {
      const result = lookupSNOMED('386661006');

      expect(result?.fsn).toBe('Fever (finding)');
      expect(result?.conceptId).toBe('386661006');
    });

    it('should return undefined for unknown code', () => {
      const result = lookupSNOMED('999999999');

      expect(result).toBeUndefined();
    });
  });

  describe('searchSNOMED', () => {
    it('should find codes by display name', () => {
      const results = searchSNOMED('fever');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.display).toBe('Fever');
    });

    it('should search by FSN', () => {
      const results = searchSNOMED('finding');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.fsn.includes('finding'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchSNOMED('DIABETES');
      const results2 = searchSNOMED('diabetes');

      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchSNOMED('xyznonexistent');

      expect(results).toHaveLength(0);
    });

    it('should find multiple matching codes', () => {
      const results = searchSNOMED('pain');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getSNOMEDExpression', () => {
    it('should return simple code without refinements', () => {
      const expression = getSNOMEDExpression('386661006');

      expect(expression).toBe('386661006');
    });

    it('should create expression with refinements', () => {
      const expression = getSNOMEDExpression('386661006', {
        '246112005': '255604002', // severity = mild
      });

      expect(expression).toBe('386661006:246112005=255604002');
    });

    it('should handle multiple refinements', () => {
      const expression = getSNOMEDExpression('386661006', {
        '246112005': '255604002', // severity = mild
        '363698007': '39937001', // finding site = lung
      });

      expect(expression).toContain('386661006');
      expect(expression).toContain('246112005=255604002');
      expect(expression).toContain('363698007=39937001');
    });

    it('should handle empty refinements', () => {
      const expression = getSNOMEDExpression('386661006', {});

      expect(expression).toBe('386661006');
    });
  });
});
