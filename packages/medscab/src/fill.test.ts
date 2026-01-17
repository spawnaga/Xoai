import { describe, it, expect } from 'vitest';
import {
  AUXILIARY_LABELS,
  createFill,
  canRefill,
  validateFillForVerification,
  getRecommendedAuxiliaryLabels,
  calculateDaysUntilRefillDue,
  generateLabelData,
  type Fill,
} from './fill';

describe('Fill Module', () => {
  describe('AUXILIARY_LABELS', () => {
    it('should have common auxiliary labels defined', () => {
      expect(AUXILIARY_LABELS.TAKE_WITH_FOOD).toBeDefined();
      expect(AUXILIARY_LABELS.MAY_CAUSE_DROWSINESS).toBeDefined();
      expect(AUXILIARY_LABELS.AVOID_ALCOHOL).toBeDefined();
      expect(AUXILIARY_LABELS.REFRIGERATE).toBeDefined();
      expect(AUXILIARY_LABELS.SHAKE_WELL).toBeDefined();
    });

    it('should have color codes for all labels', () => {
      Object.values(AUXILIARY_LABELS).forEach(label => {
        expect(label.color).toBeDefined();
        expect(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).toContain(label.color);
      });
    });

    it('should have unique codes for all labels', () => {
      const codes = Object.values(AUXILIARY_LABELS).map(l => l.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have controlled substance and high alert labels', () => {
      expect(AUXILIARY_LABELS.CONTROLLED_SUBSTANCE).toBeDefined();
      expect(AUXILIARY_LABELS.CONTROLLED_SUBSTANCE?.color).toBe('red');
      expect(AUXILIARY_LABELS.HIGH_ALERT_MEDICATION).toBeDefined();
      expect(AUXILIARY_LABELS.HIGH_ALERT_MEDICATION?.color).toBe('red');
    });
  });

  describe('createFill', () => {
    const prescription = {
      id: 'RX-001',
      rxNumber: '1234567',
      patientId: 'PAT-001',
      patientName: 'John Doe',
      drugName: 'Lisinopril',
      ndc: '12345678901',
      strength: '10mg',
      dosageForm: 'Tablet',
      quantity: 30,
      daysSupply: 30,
      directions: 'Take 1 tablet daily',
      refillsRemaining: 5,
    };

    it('should create fill with correct basic info', () => {
      const fill = createFill(prescription, 0, 'USER-001');

      expect(fill.prescriptionId).toBe('RX-001');
      expect(fill.rxNumber).toBe('1234567');
      expect(fill.fillNumber).toBe(0);
      expect(fill.patientId).toBe('PAT-001');
      expect(fill.patientName).toBe('John Doe');
    });

    it('should copy drug information', () => {
      const fill = createFill(prescription, 0, 'USER-001');

      expect(fill.drugName).toBe('Lisinopril');
      expect(fill.dispensedNdc).toBe('12345678901');
      expect(fill.strength).toBe('10mg');
      expect(fill.dosageForm).toBe('Tablet');
      expect(fill.quantityDispensed).toBe(30);
      expect(fill.daysSupply).toBe(30);
      expect(fill.directions).toBe('Take 1 tablet daily');
    });

    it('should set default values', () => {
      const fill = createFill(prescription, 0, 'USER-001');

      expect(fill.dawCode).toBe(0);
      expect(fill.isPartialFill).toBe(false);
      expect(fill.status).toBe('pending');
      expect(fill.verificationStatus).toBe('pending');
      expect(fill.packagingType).toBe('vial');
      expect(fill.labelCount).toBe(1);
      expect(fill.deliveryMethod).toBe('pickup');
    });

    it('should include DEA schedule when provided', () => {
      const csRx = { ...prescription, deaSchedule: 'II' as const };
      const fill = createFill(csRx, 0, 'USER-001');

      expect(fill.deaSchedule).toBe('II');
    });

    it('should generate unique fill ID', () => {
      const fill1 = createFill(prescription, 0, 'USER-001');
      const fill2 = createFill(prescription, 1, 'USER-001');

      expect(fill1.id).not.toBe(fill2.id);
      expect(fill1.id).toMatch(/^FILL-/);
    });
  });

  describe('canRefill', () => {
    const createPrescription = (overrides = {}) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      return {
        refillsRemaining: 5,
        writtenDate: thirtyDaysAgo,
        expirationDate: oneYearFromNow,
        lastFillDate: undefined as Date | undefined,
        daysSupply: 30,
        deaSchedule: undefined as 'II' | 'III' | 'IV' | 'V' | undefined,
        ...overrides,
      };
    };

    it('should allow refill for valid prescription', () => {
      const result = canRefill(createPrescription());

      expect(result.canRefill).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject expired prescription', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const result = canRefill(createPrescription({
        expirationDate: pastDate,
      }));

      expect(result.canRefill).toBe(false);
      expect(result.errors.some(e => e.includes('expired'))).toBe(true);
    });

    it('should reject when no refills remaining', () => {
      const result = canRefill(createPrescription({
        refillsRemaining: 0,
      }));

      expect(result.canRefill).toBe(false);
      expect(result.errors.some(e => e.includes('No refills'))).toBe(true);
    });

    it('should warn for refill too soon (80% rule)', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const result = canRefill(createPrescription({
        lastFillDate: tenDaysAgo,
        daysSupply: 30, // 80% = 24 days
      }));

      expect(result.canRefill).toBe(true);
      expect(result.warnings.some(w => w.includes('Refill too soon'))).toBe(true);
      expect(result.daysUntilEligible).toBeGreaterThan(0);
    });

    it('should allow refill after 80% of days supply', () => {
      const twentyFiveDaysAgo = new Date();
      twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);

      const result = canRefill(createPrescription({
        lastFillDate: twentyFiveDaysAgo,
        daysSupply: 30, // 80% = 24 days
      }));

      expect(result.warnings).toHaveLength(0);
    });

    it('should reject Schedule II refills', () => {
      const result = canRefill(createPrescription({
        deaSchedule: 'II',
        refillsRemaining: 1, // This shouldn't happen but test anyway
      }));

      expect(result.canRefill).toBe(false);
      expect(result.errors.some(e => e.includes('Schedule II'))).toBe(true);
    });

    it('should reject expired Schedule II (>90 days)', () => {
      const ninetyFiveDaysAgo = new Date();
      ninetyFiveDaysAgo.setDate(ninetyFiveDaysAgo.getDate() - 95);

      const result = canRefill(createPrescription({
        deaSchedule: 'II',
        refillsRemaining: 0,
        writtenDate: ninetyFiveDaysAgo,
      }));

      expect(result.canRefill).toBe(false);
      expect(result.errors.some(e => e.includes('90 days'))).toBe(true);
    });

    it('should reject expired C-III/IV/V (>6 months)', () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setDate(sevenMonthsAgo.getDate() - 200);

      const result = canRefill(createPrescription({
        deaSchedule: 'IV',
        writtenDate: sevenMonthsAgo,
      }));

      expect(result.canRefill).toBe(false);
      expect(result.errors.some(e => e.includes('6 months'))).toBe(true);
    });
  });

  describe('validateFillForVerification', () => {
    const createMockFill = (overrides: Partial<Fill> = {}): Fill => ({
      id: 'FILL-001',
      prescriptionId: 'RX-001',
      rxNumber: '1234567',
      fillNumber: 0,
      fillDate: new Date(),
      patientId: 'PAT-001',
      patientName: 'John Doe',
      drugName: 'Lisinopril',
      dispensedNdc: '12345678901',
      strength: '10mg',
      dosageForm: 'Tablet',
      quantityPrescribed: 30,
      quantityDispensed: 30,
      daysSupply: 30,
      directions: 'Take 1 tablet daily',
      dawCode: 0,
      isPartialFill: false,
      enteredBy: 'USER-001',
      filledBy: 'USER-001',
      enteredAt: new Date(),
      status: 'filled',
      verificationStatus: 'pending',
      packagingType: 'vial',
      labelCount: 1,
      auxiliaryLabels: [],
      acquisitionCost: 5,
      dispensingFee: 5,
      grossPrice: 10,
      deliveryMethod: 'pickup',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should validate complete fill', () => {
      const fill = createMockFill({
        lotNumber: 'LOT123',
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on missing NDC', () => {
      const fill = createMockFill({ dispensedNdc: '' });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('NDC'))).toBe(true);
    });

    it('should error on zero quantity', () => {
      const fill = createMockFill({ quantityDispensed: 0 });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Quantity'))).toBe(true);
    });

    it('should error on quantity exceeding prescribed', () => {
      const fill = createMockFill({
        quantityPrescribed: 30,
        quantityDispensed: 60,
      });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
    });

    it('should error on expired medication', () => {
      const fill = createMockFill({
        expirationDate: new Date('2020-01-01'),
      });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expired'))).toBe(true);
    });

    it('should warn on missing lot number', () => {
      const fill = createMockFill();

      const result = validateFillForVerification(fill);

      expect(result.warnings.some(w => w.includes('Lot number'))).toBe(true);
    });

    it('should warn if expiring within days supply', () => {
      const soonExpiring = new Date();
      soonExpiring.setDate(soonExpiring.getDate() + 15); // 15 days

      const fill = createMockFill({
        daysSupply: 30,
        expirationDate: soonExpiring,
      });

      const result = validateFillForVerification(fill);

      expect(result.warnings.some(w => w.includes('expires before'))).toBe(true);
    });

    it('should require lot number for controlled substances', () => {
      const fill = createMockFill({
        deaSchedule: 'II',
        lotNumber: undefined,
      });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Lot number required'))).toBe(true);
    });

    it('should error on partial fill without reason', () => {
      const fill = createMockFill({
        isPartialFill: true,
        partialFillReason: undefined,
      });

      const result = validateFillForVerification(fill);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Partial fill reason'))).toBe(true);
    });
  });

  describe('getRecommendedAuxiliaryLabels', () => {
    it('should recommend controlled substance label for controlled drugs', () => {
      const labels = getRecommendedAuxiliaryLabels('Oxycodone', undefined, true);

      expect(labels).toContain('CONTROLLED_SUBSTANCE');
    });

    it('should recommend COMPLETE_ENTIRE_COURSE for antibiotics', () => {
      const labels = getRecommendedAuxiliaryLabels('Amoxicillin', 'antibiotic');

      expect(labels).toContain('COMPLETE_ENTIRE_COURSE');
    });

    it('should recommend labels for fluoroquinolones', () => {
      const labels = getRecommendedAuxiliaryLabels('Ciprofloxacin');

      expect(labels).toContain('AVOID_SUNLIGHT');
      expect(labels).toContain('TAKE_WITH_PLENTY_OF_WATER');
    });

    it('should recommend TAKE_WITH_FOOD for NSAIDs', () => {
      const labels = getRecommendedAuxiliaryLabels('Ibuprofen', 'nsaid');

      expect(labels).toContain('TAKE_WITH_FOOD');
    });

    it('should recommend sedation warnings for benzodiazepines', () => {
      const labels = getRecommendedAuxiliaryLabels('Alprazolam', 'benzodiazepine');

      expect(labels).toContain('MAY_CAUSE_DROWSINESS');
      expect(labels).toContain('AVOID_ALCOHOL');
    });

    it('should recommend SHAKE_WELL for suspensions', () => {
      const labels = getRecommendedAuxiliaryLabels('Amoxicillin Suspension');

      expect(labels).toContain('SHAKE_WELL');
    });

    it('should recommend DO_NOT_CRUSH for extended release', () => {
      const labels = getRecommendedAuxiliaryLabels('Metoprolol ER');

      expect(labels).toContain('DO_NOT_CRUSH');
    });

    it('should recommend REFRIGERATE for insulin', () => {
      const labels = getRecommendedAuxiliaryLabels('Insulin Glargine');

      expect(labels).toContain('REFRIGERATE');
      expect(labels).toContain('HIGH_ALERT_MEDICATION');
    });

    it('should not duplicate labels', () => {
      const labels = getRecommendedAuxiliaryLabels('Warfarin', 'anticoagulant');

      const uniqueLabels = new Set(labels);
      expect(labels.length).toBe(uniqueLabels.size);
    });
  });

  describe('calculateDaysUntilRefillDue', () => {
    it('should calculate days until refill is due', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const result = calculateDaysUntilRefillDue(tenDaysAgo, 30, 7);

      // Due date = 10 days ago + 30 - 7 = 13 days from 10 days ago = 3 days from now
      expect(result.daysUntilDue).toBe(13);
      expect(result.isDue).toBe(false);
      expect(result.isDueSoon).toBe(false);
    });

    it('should identify when refill is due', () => {
      const twentyFiveDaysAgo = new Date();
      twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);

      const result = calculateDaysUntilRefillDue(twentyFiveDaysAgo, 30, 7);

      // Due date = 25 days ago + 30 - 7 = -2 days
      expect(result.isDue).toBe(true);
    });

    it('should identify when refill is due soon', () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const result = calculateDaysUntilRefillDue(twentyDaysAgo, 30, 7);

      // Due date = 20 days ago + 30 - 7 = 3 days
      expect(result.isDueSoon).toBe(true);
      expect(result.daysUntilDue).toBeLessThanOrEqual(7);
    });

    it('should calculate estimated run out date', () => {
      const startDate = new Date('2024-01-15');
      const result = calculateDaysUntilRefillDue(startDate, 30);

      const expectedRunOut = new Date('2024-02-14');
      expect(result.estimatedRunOutDate.toDateString()).toBe(expectedRunOut.toDateString());
    });
  });

  describe('generateLabelData', () => {
    const mockFill: Fill = {
      id: 'FILL-001',
      prescriptionId: 'RX-001',
      rxNumber: '1234567',
      fillNumber: 0,
      fillDate: new Date('2024-01-15'),
      patientId: 'PAT-001',
      patientName: 'John Doe',
      drugName: 'Lisinopril',
      dispensedNdc: '12345678901',
      strength: '10mg',
      dosageForm: 'Tablet',
      quantityPrescribed: 30,
      quantityDispensed: 30,
      daysSupply: 30,
      directions: 'Take 1 tablet daily for blood pressure',
      dawCode: 0,
      isPartialFill: false,
      enteredBy: 'USER-001',
      filledBy: 'USER-001',
      enteredAt: new Date(),
      status: 'verified',
      verificationStatus: 'approved',
      packagingType: 'vial',
      labelCount: 1,
      auxiliaryLabels: ['TAKE_WITH_FOOD'],
      acquisitionCost: 5,
      dispensingFee: 5,
      grossPrice: 10,
      deliveryMethod: 'pickup',
      manufacturerName: 'Test Pharma',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pharmacy = {
      name: 'Test Pharmacy',
      address: '123 Main St, City, ST 12345',
      phone: '555-1234',
    };

    it('should generate label with pharmacy info', () => {
      const label = generateLabelData(mockFill, pharmacy);

      expect(label.pharmacyName).toBe('Test Pharmacy');
      expect(label.pharmacyAddress).toBe('123 Main St, City, ST 12345');
      expect(label.pharmacyPhone).toBe('555-1234');
    });

    it('should include patient and prescription info', () => {
      const label = generateLabelData(mockFill, pharmacy);

      expect(label.patientName).toBe('John Doe');
      expect(label.rxNumber).toBe('1234567');
      expect(label.drugName).toBe('Lisinopril');
      expect(label.strength).toBe('10mg');
      expect(label.quantity).toBe(30);
      expect(label.daysSupply).toBe(30);
      expect(label.directions).toContain('Take 1 tablet daily');
    });

    it('should convert auxiliary label codes to text', () => {
      const label = generateLabelData(mockFill, pharmacy);

      expect(label.auxiliaryLabels).toContain('Take with food');
    });

    it('should include controlled substance warning', () => {
      const controlledFill = { ...mockFill, deaSchedule: 'II' as const };
      const label = generateLabelData(controlledFill, pharmacy);

      expect(label.isControlled).toBe(true);
      expect(label.deaSchedule).toBe('II');
      expect(label.warnings.some(w => w.includes('Federal law'))).toBe(true);
    });

    it('should calculate discard date', () => {
      const label = generateLabelData(mockFill, pharmacy);

      expect(label.discard).toBeDefined();
      expect(label.discard > mockFill.fillDate).toBe(true);
    });

    it('should use expiration date as discard if sooner', () => {
      const soonExpiring = new Date(mockFill.fillDate);
      soonExpiring.setDate(soonExpiring.getDate() + 20);

      const expiringFill = { ...mockFill, expirationDate: soonExpiring };
      const label = generateLabelData(expiringFill, pharmacy);

      expect(label.discard.toDateString()).toBe(soonExpiring.toDateString());
    });
  });
});
