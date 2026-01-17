import { describe, it, expect } from 'vitest';
import {
  generateVaccineId,
  generateImmunizationId,
  generateStandingOrderId,
  isVaccineExpired,
  isVaccineExpiringSoon,
  isBeyondUseDate,
  calculateBeyondUseDate,
  isTemperatureInRange,
  checkTemperatureExcursion,
  createVaccine,
  updateVaccineQuantity,
  allocateVaccine,
  deallocateVaccine,
  checkStandingOrderEligibility,
  createImmunizationRecord,
  voidImmunizationRecord,
  isRegistryReportingRequired,
  getIISReportingDeadline,
  isIISSubmissionOverdue,
  checkVFCEligibility,
  calculateObservationPeriod,
  createStorageUnit,
  createTemperatureLog,
  getVaccinesNeedingReorder,
  getExpiringVaccines,
  getExpiringStandingOrders,
  formatForVIS,
  getImmunizationSummary,
  STORAGE_TEMP_RANGES,
  ROUTE_NAMES,
  SITE_NAMES,
  COMMON_CVX_CODES,
  OBSERVATION_PERIODS,
  VFC_ELIGIBILITY_DESCRIPTIONS,
  IIS_REPORTING_HOURS,
  VaccineSchema,
  ImmunizationRecordSchema,
  StandingOrderSchema,
  VaccineStorageUnitSchema,
  type Vaccine,
  type ImmunizationRecord,
  type StandingOrder,
  type VaccineStorageUnit,
  type ScreeningResponse,
} from './immunization';

describe('Immunization Module', () => {
  describe('ID Generation', () => {
    it('should generate unique vaccine IDs', () => {
      const id1 = generateVaccineId();
      const id2 = generateVaccineId();

      expect(id1).toMatch(/^VAX-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VAX-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique immunization IDs', () => {
      const id1 = generateImmunizationId();
      const id2 = generateImmunizationId();

      expect(id1).toMatch(/^IMM-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^IMM-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique standing order IDs', () => {
      const id1 = generateStandingOrderId();
      const id2 = generateStandingOrderId();

      expect(id1).toMatch(/^SO-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^SO-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Vaccine Expiration', () => {
    it('should detect expired vaccine', () => {
      const vaccine = createMockVaccine({
        expirationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      expect(isVaccineExpired(vaccine)).toBe(true);
    });

    it('should detect non-expired vaccine', () => {
      const vaccine = createMockVaccine({
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });

      expect(isVaccineExpired(vaccine)).toBe(false);
    });

    it('should detect vaccine expiring soon', () => {
      const vaccine = createMockVaccine({
        expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      });

      expect(isVaccineExpiringSoon(vaccine, 30)).toBe(true);
      expect(isVaccineExpiringSoon(vaccine, 15)).toBe(false);
    });
  });

  describe('Beyond Use Date', () => {
    it('should check if vaccine is beyond use date', () => {
      const vaccine = createMockVaccine({
        multiDoseVial: true,
        beyondUseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      expect(isBeyondUseDate(vaccine)).toBe(true);
    });

    it('should return false if no beyond use date set', () => {
      const vaccine = createMockVaccine({ multiDoseVial: false });

      expect(isBeyondUseDate(vaccine)).toBe(false);
    });

    it('should calculate beyond use date', () => {
      const openedAt = new Date(2024, 0, 15); // January 15, 2024
      const beyondUseDate = calculateBeyondUseDate(openedAt, 28);

      // 28 days after January 15 = February 12
      expect(beyondUseDate.getMonth()).toBe(1); // February
      expect(beyondUseDate.getDate()).toBe(12);
    });
  });

  describe('Temperature Monitoring', () => {
    it('should validate refrigerated temperature in range', () => {
      expect(isTemperatureInRange(4, 'refrigerated')).toBe(true);
      expect(isTemperatureInRange(2, 'refrigerated')).toBe(true);
      expect(isTemperatureInRange(8, 'refrigerated')).toBe(true);
    });

    it('should detect refrigerated temperature out of range', () => {
      expect(isTemperatureInRange(0, 'refrigerated')).toBe(false);
      expect(isTemperatureInRange(10, 'refrigerated')).toBe(false);
    });

    it('should validate frozen temperature in range', () => {
      expect(isTemperatureInRange(-20, 'frozen')).toBe(true);
    });

    it('should detect temperature excursion', () => {
      const result = checkTemperatureExcursion(12, 'refrigerated');

      expect(result.excursion).toBe(true);
      expect(result.severity).toBeDefined();
    });

    it('should not flag temperature within range', () => {
      const result = checkTemperatureExcursion(4, 'refrigerated');

      expect(result.excursion).toBe(false);
    });

    it('should detect critical excursion for large deviation', () => {
      const result = checkTemperatureExcursion(15, 'refrigerated'); // More than 5°C out

      expect(result.excursion).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should detect warning excursion for small deviation', () => {
      const result = checkTemperatureExcursion(10, 'refrigerated'); // 2°C out (within 5°C)

      expect(result.excursion).toBe(true);
      expect(result.severity).toBe('warning');
    });
  });

  describe('Vaccine Inventory', () => {
    it('should create vaccine record', () => {
      const vaccine = createVaccine({
        cvxCode: '141',
        mvxCode: 'PFR',
        ndcCode: '12345678901',
        vaccineName: 'Influenza Quadrivalent',
        manufacturer: 'Pfizer',
        lotNumber: 'LOT123',
        expirationDate: new Date('2025-12-31'),
        storageType: 'refrigerated',
        tempRangeMinC: 2,
        tempRangeMaxC: 8,
        binLocation: 'A1',
        dosesPerVial: 10,
        diluentRequired: false,
        multiDoseVial: true,
        quantityOnHand: 10,
        quantityAllocated: 0,
        reorderPoint: 5,
        reorderQuantity: 20,
        vfcEligible: false,
        isActive: true,
        onHold: false,
      });

      expect(vaccine.id).toMatch(/^VAX-/);
      expect(vaccine.cvxCode).toBe('141');
      expect(vaccine.quantityOnHand).toBe(10);
      expect(vaccine.quantityAvailable).toBe(10); // quantityOnHand - quantityAllocated
    });

    it('should update vaccine quantity', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 10, quantityAllocated: 0 });
      const updated = updateVaccineQuantity(vaccine, -3, 'administered');

      expect(updated.quantityOnHand).toBe(7);
      expect(updated.quantityAvailable).toBe(7);
    });

    it('should throw error when reducing quantity below zero', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 5, quantityAllocated: 0 });

      expect(() => updateVaccineQuantity(vaccine, -10, 'administered')).toThrow(
        'Cannot reduce quantity below zero'
      );
    });

    it('should allocate vaccine', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 10, quantityAllocated: 0 });
      const allocated = allocateVaccine(vaccine, 2);

      expect(allocated.quantityAllocated).toBe(2);
      expect(allocated.quantityOnHand).toBe(10); // Quantity unchanged until dispensed
      expect(allocated.quantityAvailable).toBe(8);
    });

    it('should throw error when allocating more than available', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 10, quantityAllocated: 8 });

      expect(() => allocateVaccine(vaccine, 5)).toThrow('Insufficient vaccine quantity available');
    });

    it('should deallocate vaccine', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 10, quantityAllocated: 3 });
      const deallocated = deallocateVaccine(vaccine, 1);

      expect(deallocated.quantityAllocated).toBe(2);
      expect(deallocated.quantityAvailable).toBe(8);
    });

    it('should throw error when deallocating more than allocated', () => {
      const vaccine = createMockVaccine({ quantityOnHand: 10, quantityAllocated: 2 });

      expect(() => deallocateVaccine(vaccine, 5)).toThrow(
        'Cannot deallocate more than allocated'
      );
    });

    it('should find vaccines needing reorder', () => {
      const vaccines: Vaccine[] = [
        createMockVaccine({ quantityOnHand: 5, quantityAllocated: 0, reorderPoint: 10 }),
        createMockVaccine({ quantityOnHand: 20, quantityAllocated: 0, reorderPoint: 10 }),
        createMockVaccine({ quantityOnHand: 8, quantityAllocated: 0, reorderPoint: 10 }),
      ];

      const needReorder = getVaccinesNeedingReorder(vaccines);

      expect(needReorder).toHaveLength(2);
    });

    it('should exclude expired vaccines from reorder', () => {
      const vaccines: Vaccine[] = [
        createMockVaccine({
          quantityOnHand: 5,
          quantityAllocated: 0,
          reorderPoint: 10,
          expirationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        }),
      ];

      const needReorder = getVaccinesNeedingReorder(vaccines);

      expect(needReorder).toHaveLength(0);
    });

    it('should exclude on-hold vaccines from reorder', () => {
      const vaccines: Vaccine[] = [
        createMockVaccine({ quantityOnHand: 5, quantityAllocated: 0, reorderPoint: 10, onHold: true }),
      ];

      const needReorder = getVaccinesNeedingReorder(vaccines);

      expect(needReorder).toHaveLength(0);
    });

    it('should find expiring vaccines', () => {
      const vaccines: Vaccine[] = [
        createMockVaccine({
          expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        }),
        createMockVaccine({
          expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }),
      ];

      const expiring = getExpiringVaccines(vaccines, 30);

      expect(expiring).toHaveLength(1);
    });
  });

  describe('Standing Orders', () => {
    it('should check standing order eligibility - age requirement', () => {
      const order = createMockStandingOrder({
        minAge: 18 * 12, // 18 years in months
        maxAge: 65 * 12,
      });

      const screeningResponses: ScreeningResponse[] = [];

      const result30 = checkStandingOrderEligibility(order, 30 * 12, 'M', screeningResponses);
      const result10 = checkStandingOrderEligibility(order, 10 * 12, 'M', screeningResponses);

      expect(result30.eligible).toBe(true);
      expect(result10.eligible).toBe(false);
      expect(result10.reasons.some((r) => r.includes('below minimum'))).toBe(true);
    });

    it('should check standing order eligibility - expired order', () => {
      const order = createMockStandingOrder({
        expirationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const screeningResponses: ScreeningResponse[] = [];
      const result = checkStandingOrderEligibility(order, 30 * 12, 'M', screeningResponses);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Standing order has expired');
    });

    it('should check standing order eligibility - inactive status', () => {
      const order = createMockStandingOrder({
        status: 'revoked',
      });

      const screeningResponses: ScreeningResponse[] = [];
      const result = checkStandingOrderEligibility(order, 30 * 12, 'M', screeningResponses);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Standing order is revoked');
    });

    it('should check standing order eligibility - gender restriction', () => {
      const order = createMockStandingOrder({
        genderRestriction: 'F',
      });

      const screeningResponses: ScreeningResponse[] = [];
      const result = checkStandingOrderEligibility(order, 30 * 12, 'M', screeningResponses);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Vaccine restricted to gender: F');
    });

    it('should check standing order eligibility - contraindication screening', () => {
      const order = createMockStandingOrder();
      order.screeningQuestions = [
        {
          id: 'q1',
          question: 'Are you allergic to eggs?',
          type: 'yes_no',
          contraindication: true,
          precaution: false,
        },
      ];

      const screeningResponses: ScreeningResponse[] = [
        {
          questionId: 'q1',
          question: 'Are you allergic to eggs?',
          response: true,
          passedScreening: false,
        },
      ];
      const result = checkStandingOrderEligibility(order, 30 * 12, 'M', screeningResponses);

      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes('Contraindication'))).toBe(true);
    });

    it('should find expiring standing orders', () => {
      const orders: StandingOrder[] = [
        createMockStandingOrder({
          expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        }),
        createMockStandingOrder({
          expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }),
      ];

      const expiring = getExpiringStandingOrders(orders, 30);

      expect(expiring).toHaveLength(1);
    });
  });

  describe('Immunization Records', () => {
    it('should create immunization record', () => {
      const now = new Date();
      const record = createImmunizationRecord({
        patientId: 'patient123',
        vaccineId: 'vax123',
        vaccineName: 'Influenza Quadrivalent',
        cvxCode: '141',
        lotNumber: 'LOT123456',
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        manufacturer: 'Pfizer',
        administeredBy: 'pharmacist123',
        administeredByName: 'John Smith, RPh',
        administeredByCredential: 'RPh',
        administeredAt: now,
        administrationSite: 'left_deltoid',
        administrationRoute: 'intramuscular',
        doseAmount: 0.5,
        doseUnit: 'mL',
        doseNumber: 1,
        seriesComplete: true,
        consentObtained: true,
        visProvided: true,
        visDate: now,
        visVersion: '2024-08-15',
        visLanguage: 'en',
        vfcEligible: false,
        fundingSource: 'private',
        observationRequired: true,
        adverseReaction: false,
        registryReportingRequired: true,
        registryState: 'CA',
        registryStatus: 'pending',
        billed: false,
      });

      expect(record.id).toMatch(/^IMM-/);
      expect(record.patientId).toBe('patient123');
      expect(record.status).toBe('completed');
    });

    it('should void immunization record', () => {
      const now = new Date();
      let record = createImmunizationRecord({
        patientId: 'patient123',
        vaccineId: 'vax123',
        vaccineName: 'Influenza',
        cvxCode: '141',
        lotNumber: 'LOT123456',
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        manufacturer: 'Pfizer',
        administeredBy: 'pharmacist123',
        administeredByName: 'John Smith, RPh',
        administeredByCredential: 'RPh',
        administeredAt: now,
        administrationSite: 'left_deltoid',
        administrationRoute: 'intramuscular',
        doseAmount: 0.5,
        doseUnit: 'mL',
        doseNumber: 1,
        seriesComplete: true,
        consentObtained: true,
        visProvided: true,
        visDate: now,
        visVersion: '2024-08-15',
        visLanguage: 'en',
        vfcEligible: false,
        fundingSource: 'private',
        observationRequired: true,
        adverseReaction: false,
        registryReportingRequired: true,
        registryState: 'CA',
        registryStatus: 'pending',
        billed: false,
      });

      record = voidImmunizationRecord(record, 'pharmacist123', 'Entered in error');

      expect(record.status).toBe('void');
      expect(record.voidedBy).toBe('pharmacist123');
      expect(record.voidReason).toBe('Entered in error');
    });
  });

  describe('VFC Eligibility', () => {
    it('should identify VFC eligible - Medicaid', () => {
      const result = checkVFCEligibility(
        false, // hasInsurance
        true, // hasMedicaid
        false, // isAmericanIndianAlaskaNative
        false, // isUnderinsured
        false // isFQHC
      );

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe('medicaid');
    });

    it('should identify VFC eligible - uninsured', () => {
      const result = checkVFCEligibility(
        false, // hasInsurance
        false, // hasMedicaid
        false, // isAmericanIndianAlaskaNative
        false, // isUnderinsured
        false // isFQHC
      );

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe('uninsured');
    });

    it('should identify VFC eligible - American Indian/Alaska Native', () => {
      const result = checkVFCEligibility(
        true, // hasInsurance
        false, // hasMedicaid
        true, // isAmericanIndianAlaskaNative
        false, // isUnderinsured
        false // isFQHC
      );

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe('american_indian_alaska_native');
    });

    it('should identify VFC eligible - underinsured at FQHC', () => {
      const result = checkVFCEligibility(
        true, // hasInsurance
        false, // hasMedicaid
        false, // isAmericanIndianAlaskaNative
        true, // isUnderinsured
        true // isFQHC
      );

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe('underinsured');
    });

    it('should identify VFC ineligible - has private insurance', () => {
      const result = checkVFCEligibility(
        true, // hasInsurance
        false, // hasMedicaid
        false, // isAmericanIndianAlaskaNative
        false, // isUnderinsured
        false // isFQHC
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('not_eligible');
    });

    it('should identify VFC ineligible - underinsured but not at FQHC', () => {
      const result = checkVFCEligibility(
        true, // hasInsurance
        false, // hasMedicaid
        false, // isAmericanIndianAlaskaNative
        true, // isUnderinsured
        false // isFQHC
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('not_eligible');
    });
  });

  describe('IIS Registry Reporting', () => {
    it('should require registry reporting for all states', () => {
      expect(isRegistryReportingRequired('CA')).toBe(true);
      expect(isRegistryReportingRequired('TX')).toBe(true);
      expect(isRegistryReportingRequired('NY')).toBe(true);
    });

    it('should calculate IIS reporting deadline', () => {
      const administeredAt = new Date('2024-01-15T10:00:00');
      const deadline = getIISReportingDeadline(administeredAt, 'CA');

      // CA requires 24-hour reporting
      expect(deadline.getTime()).toBe(administeredAt.getTime() + 24 * 60 * 60 * 1000);
    });

    it('should detect overdue IIS submission', () => {
      const administeredAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      expect(isIISSubmissionOverdue(administeredAt, 'CA')).toBe(true); // CA = 24 hours
      expect(isIISSubmissionOverdue(administeredAt, 'TX')).toBe(false); // TX = 72 hours
    });
  });

  describe('Observation Period', () => {
    it('should calculate default observation period', () => {
      const period = calculateObservationPeriod(false, false, false);

      expect(period).toBe(15); // 15 minutes default
    });

    it('should calculate extended observation period for anaphylaxis history', () => {
      const period = calculateObservationPeriod(false, false, true);

      expect(period).toBe(30); // 30 minutes for anaphylaxis history
    });

    it('should calculate extended observation period for allergy history', () => {
      const period = calculateObservationPeriod(false, true, false);

      expect(period).toBe(30); // 30 minutes for allergy history
    });

    it('should calculate first dose observation period', () => {
      const period = calculateObservationPeriod(true, false, false);

      expect(period).toBe(15);
    });

    it('should prioritize anaphylaxis over allergy', () => {
      const period = calculateObservationPeriod(false, true, true);

      expect(period).toBe(30);
    });

    it('should handle COVID vaccine observation', () => {
      const period = calculateObservationPeriod(false, false, false, '208'); // Pfizer COVID

      expect(period).toBe(15);
    });
  });

  describe('Storage Unit Management', () => {
    it('should create storage unit', () => {
      const unit = createStorageUnit({
        unitName: 'Vaccine Refrigerator 1',
        unitType: 'refrigerated',
        location: 'Back room',
        currentTempC: 4,
        lastReadingAt: new Date(),
        minTemp24hC: 3,
        maxTemp24hC: 5,
        alertThresholdMinC: 2,
        alertThresholdMaxC: 8,
        alertRecipients: ['pharmacy@example.com'],
        excursionActive: false,
        isActive: true,
        isOperational: true,
        maintenanceRequired: false,
      });

      expect(unit.id).toBeDefined();
      expect(unit.unitName).toBe('Vaccine Refrigerator 1');
    });

    it('should create temperature log', () => {
      const log = createTemperatureLog('unit123', 4.5, 'refrigerated', 'user123', false);

      expect(log.temperatureC).toBe(4.5);
      expect(log.recordedBy).toBe('user123');
      expect(log.isExcursion).toBe(false);
    });

    it('should flag out-of-range temperature in log', () => {
      const log = createTemperatureLog('unit123', 12, 'refrigerated', 'user123', false);

      expect(log.isExcursion).toBe(true);
    });
  });

  describe('VIS Formatting', () => {
    it('should format immunization record for VIS', () => {
      const now = new Date();
      const record = createMockImmunizationRecord({
        vaccineName: 'Influenza Quadrivalent',
        lotNumber: 'LOT123456',
        manufacturer: 'Pfizer',
        administeredAt: now,
        visVersion: '2024-08-15',
        visDate: now,
      });

      const formatted = formatForVIS(record);

      expect(formatted).toContain('Influenza Quadrivalent');
      expect(formatted).toContain('LOT123456');
      expect(formatted).toContain('Pfizer');
    });
  });

  describe('Immunization Summary', () => {
    it('should generate immunization summary', () => {
      const records: ImmunizationRecord[] = [
        createMockImmunizationRecord({ cvxCode: '141', seriesComplete: true }),
        createMockImmunizationRecord({ cvxCode: '141', seriesComplete: true }),
        createMockImmunizationRecord({ cvxCode: '208', seriesComplete: false }),
      ];

      const summary = getImmunizationSummary(records);

      expect(summary['141']).toBeDefined();
      expect(summary['141']?.doses).toBe(2);
      expect(summary['208']).toBeDefined();
      expect(summary['208']?.doses).toBe(1);
    });

    it('should exclude voided records from summary', () => {
      const records: ImmunizationRecord[] = [
        createMockImmunizationRecord({ cvxCode: '141', status: 'completed' }),
        createMockImmunizationRecord({ cvxCode: '141', status: 'void' }),
      ];

      const summary = getImmunizationSummary(records);

      expect(summary['141']?.doses).toBe(1);
    });
  });

  describe('Constants', () => {
    it('should have storage temperature ranges', () => {
      expect(STORAGE_TEMP_RANGES.refrigerated.min).toBe(2);
      expect(STORAGE_TEMP_RANGES.refrigerated.max).toBe(8);
      expect(STORAGE_TEMP_RANGES.frozen).toBeDefined();
      expect(STORAGE_TEMP_RANGES.ultra_cold).toBeDefined();
    });

    it('should have route names', () => {
      expect(ROUTE_NAMES.intramuscular).toBe('Intramuscular (IM)');
      expect(ROUTE_NAMES.subcutaneous).toBe('Subcutaneous (SC)');
      expect(ROUTE_NAMES.intradermal).toBe('Intradermal (ID)');
    });

    it('should have site names', () => {
      expect(SITE_NAMES.left_deltoid).toBeDefined();
      expect(SITE_NAMES.right_deltoid).toBeDefined();
      expect(SITE_NAMES.left_vastus_lateralis).toBeDefined();
    });

    it('should have common CVX codes', () => {
      expect(COMMON_CVX_CODES['141']).toBeDefined(); // Influenza
      expect(COMMON_CVX_CODES['208']).toBeDefined(); // COVID-19
    });

    it('should have observation periods', () => {
      expect(OBSERVATION_PERIODS.default).toBe(15);
      expect(OBSERVATION_PERIODS.anaphylaxisHistory).toBe(30);
    });

    it('should have VFC eligibility descriptions', () => {
      expect(VFC_ELIGIBILITY_DESCRIPTIONS.medicaid).toBeDefined();
      expect(VFC_ELIGIBILITY_DESCRIPTIONS.uninsured).toBeDefined();
    });

    it('should have IIS reporting hours by state', () => {
      expect(IIS_REPORTING_HOURS['CA']).toBe(24);
      expect(IIS_REPORTING_HOURS['TX']).toBe(72);
    });
  });

  describe('Schema Validation', () => {
    it('should validate vaccine schema', () => {
      const vaccine = createMockVaccine();

      const result = VaccineSchema.safeParse(vaccine);
      expect(result.success).toBe(true);
    });

    it('should validate immunization record schema', () => {
      const record = createMockImmunizationRecord();

      const result = ImmunizationRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should validate standing order schema', () => {
      const order = createMockStandingOrder();

      const result = StandingOrderSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('should validate storage unit schema', () => {
      const unit = createMockStorageUnit('refrigerated');

      const result = VaccineStorageUnitSchema.safeParse(unit);
      expect(result.success).toBe(true);
    });
  });
});

// Helper Functions
function createMockVaccine(overrides: Partial<Vaccine> = {}): Vaccine {
  const now = new Date();
  const quantityOnHand = overrides.quantityOnHand ?? 10;
  const quantityAllocated = overrides.quantityAllocated ?? 0;
  // Calculate quantityAvailable from provided values, or use explicit override if given
  const quantityAvailable =
    overrides.quantityAvailable ?? quantityOnHand - quantityAllocated;
  return {
    id: generateVaccineId(),
    cvxCode: '141',
    mvxCode: 'PFR',
    vaccineName: 'Influenza Quadrivalent',
    brandName: 'Fluzone',
    manufacturer: 'Pfizer',
    lotNumber: 'LOT123456',
    expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    storageType: 'refrigerated',
    tempRangeMinC: 2,
    tempRangeMaxC: 8,
    binLocation: 'A1',
    dosesPerVial: 10,
    diluentRequired: false,
    multiDoseVial: false,
    reorderPoint: overrides.reorderPoint ?? 5,
    reorderQuantity: 20,
    vfcEligible: false,
    ndcCode: '12345678901',
    cptCode: '90686',
    isActive: overrides.isActive ?? true,
    onHold: overrides.onHold ?? false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
    quantityOnHand,
    quantityAllocated,
    quantityAvailable,
  };
}

function createMockStandingOrder(overrides: Partial<StandingOrder> = {}): StandingOrder {
  const now = new Date();
  return {
    id: generateStandingOrderId(),
    vaccineName: 'Influenza Quadrivalent',
    cvxCode: '141',
    protocolName: 'Adult Influenza Standing Order',
    authorizedBy: 'Dr. Smith',
    authorizedByNPI: '1234567890',
    effectiveDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    expirationDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    status: 'active',
    minAge: 18 * 12,
    maxAge: undefined,
    contraindications: ['Severe allergic reaction to vaccine component'],
    precautions: ['Moderate or severe acute illness'],
    dosing: {
      amount: 0.5,
      unit: 'mL',
      route: 'intramuscular',
      site: 'left_deltoid',
    },
    screeningQuestions: [],
    observationRequired: true,
    observationMinutes: 15,
    visRequired: true,
    visVersion: '2024-08-15',
    pharmacyId: 'pharmacy123',
    state: 'CA',
    createdBy: 'admin123',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockStorageUnit(
  type: 'refrigerated' | 'frozen' | 'ultra_cold'
): VaccineStorageUnit {
  const ranges = STORAGE_TEMP_RANGES[type];
  const now = new Date();
  return {
    id: `STU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    unitName: `${type.charAt(0).toUpperCase() + type.slice(1)} Unit 1`,
    unitType: type,
    location: 'Pharmacy',
    currentTempC: (ranges.min + ranges.max) / 2,
    lastReadingAt: now,
    minTemp24hC: ranges.min + 1,
    maxTemp24hC: ranges.max - 1,
    alertThresholdMinC: ranges.min,
    alertThresholdMaxC: ranges.max,
    alertRecipients: ['pharmacy@example.com'],
    excursionActive: false,
    isActive: true,
    isOperational: true,
    maintenanceRequired: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createMockImmunizationRecord(
  overrides: Partial<ImmunizationRecord> = {}
): ImmunizationRecord {
  const now = new Date();
  return {
    id: generateImmunizationId(),
    patientId: 'patient123',
    vaccineId: 'vax123',
    vaccineName: 'Influenza Quadrivalent',
    cvxCode: '141',
    lotNumber: 'LOT123456',
    expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    manufacturer: 'Pfizer',
    administeredBy: 'pharmacist123',
    administeredByName: 'John Smith, RPh',
    administeredByCredential: 'RPh',
    administeredAt: now,
    administrationSite: 'left_deltoid',
    administrationRoute: 'intramuscular',
    doseAmount: 0.5,
    doseUnit: 'mL',
    doseNumber: 1,
    seriesComplete: true,
    consentObtained: true,
    visProvided: true,
    visDate: now,
    visVersion: '2024-08-15',
    visLanguage: 'en',
    vfcEligible: false,
    fundingSource: 'private',
    observationRequired: true,
    adverseReaction: false,
    registryReportingRequired: true,
    registryState: 'CA',
    registryStatus: 'pending',
    status: 'completed',
    billed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
