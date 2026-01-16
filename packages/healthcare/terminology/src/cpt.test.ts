import { describe, it, expect } from 'vitest';
import {
  validateCPTFormat,
  getCPTCategory,
  searchCPT,
  lookupCPT,
  getEMCodes,
  getCPTByCategory,
  cptToCodeableConcept,
  validateModifier,
  getModifierDescription,
  CPTLookupService,
  CPT_SYSTEM,
  CPT_MODIFIERS,
} from './cpt';

describe('CPT Terminology', () => {
  describe('validateCPTFormat', () => {
    it('should validate standard 5-digit CPT codes', () => {
      expect(validateCPTFormat('99213')).toBe(true);
      expect(validateCPTFormat('99214')).toBe(true);
      expect(validateCPTFormat('36415')).toBe(true);
      expect(validateCPTFormat('85025')).toBe(true);
    });

    it('should validate Category II codes (4 digits + F)', () => {
      expect(validateCPTFormat('0001F')).toBe(true);
      expect(validateCPTFormat('9999F')).toBe(true);
    });

    it('should validate Category III codes (4 digits + T)', () => {
      expect(validateCPTFormat('0001T')).toBe(true);
      expect(validateCPTFormat('0999T')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateCPTFormat('1234')).toBe(false);
      expect(validateCPTFormat('123456')).toBe(false);
      expect(validateCPTFormat('ABCDE')).toBe(false);
      expect(validateCPTFormat('')).toBe(false);
      expect(validateCPTFormat('1234X')).toBe(false);
    });
  });

  describe('getCPTCategory', () => {
    it('should return evaluation-management for E/M codes', () => {
      expect(getCPTCategory('99213')).toBe('evaluation-management');
      expect(getCPTCategory('99214')).toBe('evaluation-management');
      expect(getCPTCategory('99215')).toBe('evaluation-management');
      expect(getCPTCategory('99221')).toBe('evaluation-management');
    });

    it('should return surgery for surgery codes', () => {
      expect(getCPTCategory('36415')).toBe('surgery');
      expect(getCPTCategory('10000')).toBe('surgery');
      expect(getCPTCategory('69999')).toBe('surgery');
    });

    it('should return radiology for radiology codes', () => {
      expect(getCPTCategory('71046')).toBe('radiology');
      expect(getCPTCategory('70000')).toBe('radiology');
      expect(getCPTCategory('79999')).toBe('radiology');
    });

    it('should return pathology-laboratory for lab codes', () => {
      expect(getCPTCategory('85025')).toBe('pathology-laboratory');
      expect(getCPTCategory('80053')).toBe('pathology-laboratory');
      expect(getCPTCategory('83036')).toBe('pathology-laboratory');
    });

    it('should return medicine for medicine codes', () => {
      expect(getCPTCategory('90471')).toBe('medicine');
      expect(getCPTCategory('96372')).toBe('medicine');
    });

    it('should return category-ii for quality measure codes', () => {
      expect(getCPTCategory('0001F')).toBe('category-ii');
      expect(getCPTCategory('9999F')).toBe('category-ii');
    });

    it('should return category-iii for emerging tech codes', () => {
      expect(getCPTCategory('0001T')).toBe('category-iii');
      expect(getCPTCategory('0999T')).toBe('category-iii');
    });

    it('should return undefined for invalid codes', () => {
      expect(getCPTCategory('invalid')).toBeUndefined();
      expect(getCPTCategory('')).toBeUndefined();
    });
  });

  describe('searchCPT', () => {
    it('should find codes by code number', () => {
      const results = searchCPT('99213');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('99213');
    });

    it('should find codes by description', () => {
      const results = searchCPT('office visit');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.display.toLowerCase().includes('office visit'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const results1 = searchCPT('BLOOD COUNT');
      const results2 = searchCPT('blood count');
      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchCPT('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('should include RVU in results', () => {
      const results = searchCPT('99214');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].rvu).toBeDefined();
    });
  });

  describe('lookupCPT', () => {
    it('should find CPT by code', () => {
      const result = lookupCPT('99213');
      expect(result).toBeDefined();
      expect(result?.code).toBe('99213');
      expect(result?.shortDescription).toContain('established patient');
    });

    it('should return full CPT properties', () => {
      const result = lookupCPT('99214');
      expect(result).toBeDefined();
      expect(result?.code).toBe('99214');
      expect(result?.shortDescription).toBeDefined();
      expect(result?.longDescription).toBeDefined();
      expect(result?.category).toBe('evaluation-management');
      expect(result?.relativeValueUnits).toBeDefined();
    });

    it('should return undefined for unknown code', () => {
      const result = lookupCPT('00000');
      expect(result).toBeUndefined();
    });
  });

  describe('getEMCodes', () => {
    it('should return evaluation/management codes', () => {
      const codes = getEMCodes();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.category === 'evaluation-management')).toBe(true);
    });

    it('should include common office visit codes', () => {
      const codes = getEMCodes();
      const codeset = new Set(codes.map((c) => c.code));
      expect(codeset.has('99213')).toBe(true);
      expect(codeset.has('99214')).toBe(true);
    });
  });

  describe('getCPTByCategory', () => {
    it('should return codes for evaluation-management category', () => {
      const codes = getCPTByCategory('evaluation-management');
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.category === 'evaluation-management')).toBe(true);
    });

    it('should return codes for pathology-laboratory category', () => {
      const codes = getCPTByCategory('pathology-laboratory');
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.category === 'pathology-laboratory')).toBe(true);
    });

    it('should return codes for radiology category', () => {
      const codes = getCPTByCategory('radiology');
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.category === 'radiology')).toBe(true);
    });

    it('should return empty array for category with no codes', () => {
      const codes = getCPTByCategory('anesthesia');
      expect(codes).toHaveLength(0);
    });
  });

  describe('cptToCodeableConcept', () => {
    it('should create CodeableConcept for known CPT code', () => {
      const result = cptToCodeableConcept('99213');

      expect(result.coding).toHaveLength(1);
      expect(result.coding[0].system).toBe(CPT_SYSTEM);
      expect(result.coding[0].code).toBe('99213');
      expect(result.coding[0].display).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should create CodeableConcept for unknown CPT code', () => {
      const result = cptToCodeableConcept('00000');

      expect(result.coding).toHaveLength(1);
      expect(result.coding[0].system).toBe(CPT_SYSTEM);
      expect(result.coding[0].code).toBe('00000');
      expect(result.coding[0].display).toBeUndefined();
    });
  });

  describe('CPT_SYSTEM', () => {
    it('should be the correct AMA CPT system URI', () => {
      expect(CPT_SYSTEM).toBe('http://www.ama-assn.org/go/cpt');
    });
  });

  describe('CPT_MODIFIERS', () => {
    it('should have common modifiers defined', () => {
      expect(CPT_MODIFIERS['25']).toBeDefined();
      expect(CPT_MODIFIERS['26']).toBeDefined();
      expect(CPT_MODIFIERS['59']).toBeDefined();
      expect(CPT_MODIFIERS['TC']).toBeDefined();
    });

    it('should have laterality modifiers', () => {
      expect(CPT_MODIFIERS['LT']).toBe('Left Side');
      expect(CPT_MODIFIERS['RT']).toBe('Right Side');
    });

    it('should have bilateral modifier', () => {
      expect(CPT_MODIFIERS['50']).toBe('Bilateral Procedure');
    });
  });

  describe('validateModifier', () => {
    it('should return true for valid modifiers', () => {
      expect(validateModifier('25')).toBe(true);
      expect(validateModifier('26')).toBe(true);
      expect(validateModifier('59')).toBe(true);
      expect(validateModifier('LT')).toBe(true);
      expect(validateModifier('RT')).toBe(true);
    });

    it('should return false for invalid modifiers', () => {
      expect(validateModifier('XX')).toBe(false);
      expect(validateModifier('99')).toBe(false);
      expect(validateModifier('')).toBe(false);
    });
  });

  describe('getModifierDescription', () => {
    it('should return description for valid modifier', () => {
      expect(getModifierDescription('25')).toBe('Significant, Separately Identifiable E/M Service');
      expect(getModifierDescription('26')).toBe('Professional Component');
      expect(getModifierDescription('TC')).toBe('Technical Component');
    });

    it('should return undefined for invalid modifier', () => {
      expect(getModifierDescription('XX')).toBeUndefined();
      expect(getModifierDescription('')).toBeUndefined();
    });
  });

  describe('CPTLookupService', () => {
    let service: CPTLookupService;

    beforeEach(() => {
      service = new CPTLookupService();
    });

    it('should search with limit', () => {
      const results = service.search('office', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should lookup single code', () => {
      const result = service.lookup('99213');
      expect(result).toBeDefined();
      expect(result?.code).toBe('99213');
    });

    it('should get office visit codes', () => {
      const codes = service.getOfficeVisitCodes();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.some((c) => c.code === '99213')).toBe(true);
      expect(codes.some((c) => c.code === '99214')).toBe(true);
    });

    it('should get common lab codes', () => {
      const codes = service.getCommonLabCodes();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.category === 'pathology-laboratory')).toBe(true);
    });
  });
});
