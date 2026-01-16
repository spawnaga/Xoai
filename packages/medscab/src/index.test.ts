import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchDrugs,
  getDrugById,
  isValidNDC,
  checkDrugInteractions,
  checkContraindications,
  checkAllergies,
  comprehensiveSafetyCheck,
  performDURCheck,
  quickDURCheck,
  getDosingGuidelines,
  getStandardFrequencies,
  getStandardRoutes,
  DEAScheduleInfo,
  ALLERGY_CROSS_REACTIVITY,
} from './index';

describe('MedsCab Package', () => {
  describe('Drug Search', () => {
    it('should search drugs by name', async () => {
      const result = await searchDrugs({ query: 'lisinopril' });

      expect(result.drugs.length).toBeGreaterThan(0);
      expect(result.drugs[0].genericName.toLowerCase()).toContain('lisinopril');
      expect(['rxnorm', 'fallback']).toContain(result.source);
    });

    it('should search drugs by brand name', async () => {
      const result = await searchDrugs({ query: 'Lipitor' });

      expect(result.drugs.length).toBeGreaterThan(0);
      expect(result.drugs[0].brandName).toBe('Lipitor');
    });

    it('should filter by dosage form', async () => {
      const result = await searchDrugs({ query: 'omeprazole', dosageForm: 'capsule' });

      expect(result.drugs.length).toBeGreaterThan(0);
      expect(result.drugs[0].dosageForm.toLowerCase()).toContain('capsule');
    });

    it('should limit results', async () => {
      const result = await searchDrugs({ query: 'a', limit: 5 });

      expect(result.drugs.length).toBeLessThanOrEqual(5);
    });

    it('should get drug by ID', async () => {
      const drug = await getDrugById('fb-001');

      expect(drug).not.toBeNull();
      expect(drug?.genericName).toBe('lisinopril');
    });

    it('should return null for unknown drug ID', async () => {
      const drug = await getDrugById('unknown-id');

      expect(drug).toBeNull();
    });
  });

  describe('NDC Validation', () => {
    it('should validate correct NDC formats', () => {
      expect(isValidNDC('0069-0150-30')).toBe(true); // 4-4-2
      expect(isValidNDC('00069-150-30')).toBe(true); // 5-3-2
      expect(isValidNDC('00069-0150-1')).toBe(true); // 5-4-1
      expect(isValidNDC('00069-0150-30')).toBe(true); // 5-4-2
      expect(isValidNDC('00069015030')).toBe(true); // Without dashes
    });

    it('should reject invalid NDC formats', () => {
      expect(isValidNDC('12345')).toBe(false);
      expect(isValidNDC('invalid')).toBe(false);
      expect(isValidNDC('')).toBe(false);
    });
  });

  describe('Drug Interactions', () => {
    it('should detect warfarin-aspirin interaction', () => {
      const result = checkDrugInteractions('warfarin', ['aspirin']);

      expect(result.hasInteractions).toBe(true);
      expect(result.highSeverityCount).toBeGreaterThan(0);
      expect(result.interactions[0].severity).toBe('high');
    });

    it('should detect warfarin-ibuprofen interaction', () => {
      const result = checkDrugInteractions('warfarin', ['ibuprofen']);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions.some(i => i.description.toLowerCase().includes('bleeding'))).toBe(true);
    });

    it('should detect statin-clarithromycin interaction', () => {
      const result = checkDrugInteractions('simvastatin', ['clarithromycin']);

      expect(result.hasInteractions).toBe(true);
      expect(result.highSeverityCount).toBeGreaterThan(0);
    });

    it('should detect opioid-benzodiazepine interaction', () => {
      const result = checkDrugInteractions('hydrocodone', ['alprazolam']);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions[0].description.toLowerCase()).toContain('respiratory');
    });

    it('should return no interactions for safe combinations', () => {
      const result = checkDrugInteractions('lisinopril', ['metformin']);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions.length).toBe(0);
    });

    it('should detect duplicate therapy', () => {
      const result = checkDrugInteractions('lisinopril', ['enalapril']);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions.some(i => i.description.toLowerCase().includes('duplicate'))).toBe(true);
    });

    it('should generate correct summary', () => {
      const result = checkDrugInteractions('warfarin', ['aspirin', 'ibuprofen']);

      expect(result.summary).toContain('interaction');
      expect(result.summary).toContain('high-severity');
    });
  });

  describe('Contraindications', () => {
    it('should detect warfarin contraindication in pregnancy', () => {
      const result = checkContraindications('warfarin', ['pregnancy']);

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications[0].severity).toBe('high');
    });

    it('should detect metformin contraindication in kidney disease', () => {
      const result = checkContraindications('metformin', ['kidney disease']);

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications.some(c => c.alternativeDrugs?.length)).toBe(true);
    });

    it('should detect NSAID contraindications', () => {
      const result = checkContraindications('ibuprofen', ['peptic ulcer', 'kidney disease']);

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications.length).toBeGreaterThanOrEqual(2);
    });

    it('should return no contraindications when none exist', () => {
      const result = checkContraindications('lisinopril', ['diabetes', 'hyperlipidemia']);

      expect(result.hasContraindications).toBe(false);
    });
  });

  describe('Allergy Checking', () => {
    it('should detect direct allergy match', () => {
      const result = checkAllergies('penicillin', ['penicillin']);

      expect(result.hasAllergies).toBe(true);
      expect(result.alerts[0].type).toBe('direct_match');
      expect(result.alerts[0].severity).toBe('high');
    });

    it('should detect penicillin cross-reactivity with amoxicillin', () => {
      const result = checkAllergies('amoxicillin', ['penicillin']);

      expect(result.hasAllergies).toBe(true);
      expect(result.alerts[0].type).toBe('cross_reactivity');
    });

    it('should detect aspirin-NSAID cross-reactivity', () => {
      const result = checkAllergies('ibuprofen', ['aspirin']);

      expect(result.hasAllergies).toBe(true);
      expect(result.crossReactivityWarnings.length).toBeGreaterThan(0);
    });

    it('should detect opioid cross-reactivity', () => {
      const result = checkAllergies('oxycodone', ['codeine']);

      expect(result.hasAllergies).toBe(true);
    });

    it('should return no allergies when none exist', () => {
      const result = checkAllergies('lisinopril', ['peanuts', 'shellfish']);

      expect(result.hasAllergies).toBe(false);
    });
  });

  describe('Comprehensive Safety Check', () => {
    it('should perform complete safety evaluation', () => {
      const result = comprehensiveSafetyCheck(
        'warfarin',
        ['aspirin', 'ibuprofen'],
        ['liver disease'],
        ['penicillin']
      );

      expect(result.safe).toBe(false);
      expect(result.interactions.hasInteractions).toBe(true);
      expect(result.contraindications.hasContraindications).toBe(true);
      expect(result.overallRisk).toBe('high');
    });

    it('should pass for safe medication', () => {
      const result = comprehensiveSafetyCheck(
        'lisinopril',
        ['metformin'],
        ['diabetes'],
        []
      );

      expect(result.safe).toBe(true);
      expect(result.overallRisk).toBe('low');
    });
  });

  describe('DUR Check', () => {
    it('should perform comprehensive DUR check', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'warfarin',
        dosage: '5 mg',
        frequency: 'once daily',
        route: 'oral',
        currentMedications: ['aspirin'],
        patientAllergies: [],
        patientConditions: ['atrial fibrillation'],
        patientAge: 70,
      });

      expect(result.passed).toBe(false);
      expect(result.hasHighSeverityAlerts).toBe(true);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('should detect age-related alerts for elderly', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'alprazolam',
        dosage: '0.5 mg',
        frequency: 'three times daily',
        route: 'oral',
        patientAge: 75,
      });

      expect(result.alerts.some(a => a.type === 'age_alert')).toBe(true);
      expect(result.alerts.some(a => a.message.toLowerCase().includes('beers'))).toBe(true);
    });

    it('should detect renal alerts', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'metformin',
        dosage: '500 mg',
        frequency: 'twice daily',
        route: 'oral',
        creatinineClearance: 25,
      });

      expect(result.alerts.some(a => a.type === 'renal_alert')).toBe(true);
      expect(result.alerts.some(a => a.severity === 'high')).toBe(true);
    });

    it('should detect pregnancy alerts', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'warfarin',
        dosage: '5 mg',
        frequency: 'once daily',
        route: 'oral',
        isPregnant: true,
      });

      expect(result.alerts.some(a => a.type === 'pregnancy_alert')).toBe(true);
      expect(result.alerts.some(a => a.code.includes('PREG-X'))).toBe(true);
    });

    it('should add monitoring requirements', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'warfarin',
        dosage: '5 mg',
        frequency: 'once daily',
        route: 'oral',
      });

      expect(result.alerts.some(a => a.type === 'monitoring_required')).toBe(true);
    });

    it('should pass for safe prescription', async () => {
      const result = await performDURCheck({
        patientId: 'test-patient-id',
        drugId: 'test-drug-id',
        drugName: 'acetaminophen',
        dosage: '500 mg',
        frequency: 'every 6 hours as needed',
        route: 'oral',
        patientAge: 40,
      });

      expect(result.alertCount).toBe(0);
      expect(result.passed).toBe(true);
    });
  });

  describe('Quick DUR Check', () => {
    it('should perform quick interaction check', () => {
      const result = quickDURCheck('warfarin', ['aspirin']);

      expect(result.safe).toBe(false);
      expect(result.highAlerts).toBeGreaterThan(0);
    });

    it('should return safe for no interactions', () => {
      const result = quickDURCheck('lisinopril', ['metformin']);

      expect(result.safe).toBe(true);
      expect(result.alertCount).toBe(0);
    });
  });

  describe('Dosing Guidelines', () => {
    it('should return dosing guidelines for known drug', () => {
      const result = getDosingGuidelines({
        drugName: 'lisinopril',
        patientAge: 55,
      });

      expect(result.guidelines.length).toBeGreaterThan(0);
      expect(result.guidelines[0].drugName).toBe('Lisinopril');
      expect(result.guidelines[0].monitoringParameters.length).toBeGreaterThan(0);
    });

    it('should apply geriatric adjustments', () => {
      const result = getDosingGuidelines({
        drugName: 'lisinopril',
        patientAge: 75,
      });

      expect(result.patientSpecific.ageGroup).toBe('geriatric');
      expect(result.patientSpecific.requiresAdjustment).toBe(true);
    });

    it('should apply renal adjustments', () => {
      const result = getDosingGuidelines({
        drugName: 'gabapentin',
        patientAge: 50,
        creatinineClearance: 40,
      });

      expect(result.patientSpecific.renalStatus).toContain('Moderate');
      expect(result.guidelines[0].notes?.some(n => n.toLowerCase().includes('renal'))).toBe(true);
    });

    it('should filter by indication', () => {
      const result = getDosingGuidelines({
        drugName: 'lisinopril',
        patientAge: 55,
        indication: 'heart failure',
      });

      expect(result.guidelines[0].indication).toContain('Heart Failure');
    });

    it('should return generic guidance for unknown drugs', () => {
      const result = getDosingGuidelines({
        drugName: 'unknownDrug123',
        patientAge: 40,
      });

      expect(result.guidelines.length).toBe(1);
      expect(result.guidelines[0].standardDose).toContain('prescribing information');
    });
  });

  describe('Standard Frequencies and Routes', () => {
    it('should return standard frequencies for oral route', () => {
      const frequencies = getStandardFrequencies('oral');

      expect(frequencies).toContain('Once daily');
      expect(frequencies).toContain('Twice daily');
      expect(frequencies.length).toBeGreaterThan(5);
    });

    it('should return standard frequencies for injection', () => {
      const frequencies = getStandardFrequencies('injection');

      expect(frequencies).toContain('Weekly');
      expect(frequencies).toContain('Monthly');
    });

    it('should return all standard routes', () => {
      const routes = getStandardRoutes();

      expect(routes).toContain('Oral');
      expect(routes).toContain('Intravenous');
      expect(routes).toContain('Subcutaneous');
      expect(routes).toContain('Topical');
    });
  });

  describe('Constants', () => {
    it('should have DEA schedule information', () => {
      expect(DEAScheduleInfo['II'].refillsAllowed).toBe(0);
      expect(DEAScheduleInfo['IV'].refillsAllowed).toBe(5);
      expect(DEAScheduleInfo['OTC'].description).toContain('Over-the-counter');
    });

    it('should have allergy cross-reactivity data', () => {
      expect(ALLERGY_CROSS_REACTIVITY['penicillin']).toContain('amoxicillin');
      expect(ALLERGY_CROSS_REACTIVITY['nsaids']).toContain('ibuprofen');
      expect(ALLERGY_CROSS_REACTIVITY['codeine']).toContain('morphine');
    });
  });
});
