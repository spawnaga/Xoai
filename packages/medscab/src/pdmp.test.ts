import { describe, it, expect } from 'vitest';
import {
  generateQueryId,
  generateAlertId,
  calculateMME,
  calculateTotalDailyMME,
  detectOverlappingPrescriptions,
  countUniquePrescribers,
  countUniquePharmacies,
  countCashTransactions,
  detectEarlyRefills,
  createAlert,
  analyzeResults,
  createPDMPResult,
  acknowledgeAlert,
  markResultReviewed,
  isPDMPQueryRequired,
  formatPDMPSummary,
  filterByDateRange,
  filterBySchedule,
  filterByPrescriber,
  filterByPharmacy,
  MME_CONVERSION_FACTORS,
  MME_THRESHOLDS,
  PATTERN_THRESHOLDS,
  RISK_SCORE_WEIGHTS,
  PDMP_ALERT_INFO,
  PDMPQuerySchema,
  type PDMPPrescription,
  type PDMPQuery,
} from './pdmp';

describe('PDMP Module', () => {
  describe('ID Generation', () => {
    it('should generate unique query IDs', () => {
      const id1 = generateQueryId();
      const id2 = generateQueryId();

      expect(id1).toMatch(/^PDMP-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^PDMP-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique alert IDs', () => {
      const id1 = generateAlertId();
      const id2 = generateAlertId();

      expect(id1).toMatch(/^ALERT-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^ALERT-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('MME Calculations', () => {
    it('should calculate MME for hydrocodone correctly', () => {
      const result = calculateMME({
        drugName: 'Hydrocodone 10mg',
        strength: 10,
        strengthUnit: 'mg',
        quantity: 90,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(1);
      expect(result.dailyDose).toBe(30); // (90 * 10) / 30
      expect(result.dailyMME).toBe(30);
      expect(result.isHighDose).toBe(false);
    });

    it('should calculate MME for oxycodone correctly', () => {
      const result = calculateMME({
        drugName: 'Oxycodone 30mg',
        strength: 30,
        strengthUnit: 'mg',
        quantity: 60,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(1.5);
      expect(result.dailyDose).toBe(60); // (60 * 30) / 30
      expect(result.dailyMME).toBe(90); // 60 * 1.5
      expect(result.isHighDose).toBe(true);
    });

    it('should calculate MME for morphine correctly', () => {
      const result = calculateMME({
        drugName: 'Morphine sulfate 15mg',
        strength: 15,
        strengthUnit: 'mg',
        quantity: 120,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(1);
      expect(result.dailyDose).toBe(60);
      expect(result.dailyMME).toBe(60);
    });

    it('should handle methadone dose-dependent conversion for low doses', () => {
      const result = calculateMME({
        drugName: 'Methadone 10mg',
        strength: 10,
        strengthUnit: 'mg',
        quantity: 30,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(4); // 1-20mg = 4
      expect(result.dailyMME).toBe(40);
    });

    it('should handle methadone dose-dependent conversion for high doses', () => {
      const result = calculateMME({
        drugName: 'Methadone 80mg',
        strength: 80,
        strengthUnit: 'mg',
        quantity: 30,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(12); // 61+ mg = 12
    });

    it('should flag high dose at warning threshold', () => {
      const result = calculateMME({
        drugName: 'Oxycodone 40mg',
        strength: 40,
        strengthUnit: 'mg',
        quantity: 90,
        daysSupply: 30,
      });

      expect(result.dailyMME).toBeGreaterThanOrEqual(MME_THRESHOLDS.WARNING);
      expect(result.isHighDose).toBe(true);
    });

    it('should return zero MME for unknown drugs', () => {
      const result = calculateMME({
        drugName: 'Ibuprofen 400mg',
        strength: 400,
        strengthUnit: 'mg',
        quantity: 60,
        daysSupply: 30,
      });

      expect(result.mmeConversionFactor).toBe(0);
      expect(result.dailyMME).toBe(0);
    });
  });

  describe('calculateTotalDailyMME', () => {
    it('should calculate total MME from active prescriptions', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          mmePerDay: 45,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
        {
          dispensedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          drugName: 'Hydrocodone',
          deaSchedule: 'II',
          quantity: 90,
          daysSupply: 30,
          mmePerDay: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Jones',
          prescriberDEA: 'BJ1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
      ];

      const totalMME = calculateTotalDailyMME(prescriptions);
      expect(totalMME).toBe(75); // 45 + 30
    });

    it('should exclude expired prescriptions', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30, // Expired 30 days ago
          mmePerDay: 45,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
      ];

      const totalMME = calculateTotalDailyMME(prescriptions);
      expect(totalMME).toBe(0);
    });
  });

  describe('detectOverlappingPrescriptions', () => {
    it('should detect overlapping prescriptions', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
        {
          dispensedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Overlaps by 15 days
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Jones',
          prescriberDEA: 'BJ1234567',
          pharmacyName: 'Other Pharmacy',
          pharmacyDEA: 'CP1234567',
          paymentType: 'cash',
        },
      ];

      const result = detectOverlappingPrescriptions(prescriptions);
      expect(result.overlappingDays).toBeGreaterThan(0);
      expect(result.pairs).toHaveLength(1);
    });

    it('should return zero overlap for non-overlapping prescriptions', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
        {
          dispensedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
      ];

      const result = detectOverlappingPrescriptions(prescriptions);
      expect(result.overlappingDays).toBe(0);
      expect(result.pairs).toHaveLength(0);
    });
  });

  describe('countUniquePrescribers', () => {
    it('should count unique prescribers correctly', () => {
      const prescriptions: PDMPPrescription[] = [
        createMockPrescription({ prescriberName: 'Dr. Smith', prescriberDEA: 'AS1234567' }),
        createMockPrescription({ prescriberName: 'Dr. Jones', prescriberDEA: 'BJ1234567' }),
        createMockPrescription({ prescriberName: 'Dr. Smith', prescriberDEA: 'AS1234567' }),
        createMockPrescription({ prescriberName: 'Dr. Williams', prescriberDEA: 'CW1234567' }),
      ];

      const result = countUniquePrescribers(prescriptions);
      expect(result.count).toBe(3);
      expect(result.prescribers).toHaveLength(3);
    });
  });

  describe('countUniquePharmacies', () => {
    it('should count unique pharmacies correctly', () => {
      const prescriptions: PDMPPrescription[] = [
        createMockPrescription({ pharmacyName: 'Pharmacy A', pharmacyDEA: 'AP1234567' }),
        createMockPrescription({ pharmacyName: 'Pharmacy B', pharmacyDEA: 'BP1234567' }),
        createMockPrescription({ pharmacyName: 'Pharmacy A', pharmacyDEA: 'AP1234567' }),
      ];

      const result = countUniquePharmacies(prescriptions);
      expect(result.count).toBe(2);
      expect(result.pharmacies).toHaveLength(2);
    });
  });

  describe('countCashTransactions', () => {
    it('should count cash transactions', () => {
      const prescriptions: PDMPPrescription[] = [
        createMockPrescription({ paymentType: 'cash' }),
        createMockPrescription({ paymentType: 'insurance' }),
        createMockPrescription({ paymentType: 'cash' }),
        createMockPrescription({ paymentType: 'medicaid' }),
      ];

      const count = countCashTransactions(prescriptions);
      expect(count).toBe(2);
    });
  });

  describe('detectEarlyRefills', () => {
    it('should detect early refills', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          drugName: 'Oxycodone',
          drugNDC: '12345678901',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
        {
          dispensedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Only 20 days after first fill
          drugName: 'Oxycodone',
          drugNDC: '12345678901',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 1,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
      ];

      const earlyRefills = detectEarlyRefills(prescriptions);
      expect(earlyRefills).toHaveLength(1);
    });

    it('should not flag appropriate refill timing', () => {
      const now = new Date();
      const prescriptions: PDMPPrescription[] = [
        {
          dispensedDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
          drugName: 'Oxycodone',
          drugNDC: '12345678901',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
        {
          dispensedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 30 days after first fill
          drugName: 'Oxycodone',
          drugNDC: '12345678901',
          deaSchedule: 'II',
          quantity: 60,
          daysSupply: 30,
          refillNumber: 1,
          prescriberName: 'Dr. Smith',
          prescriberDEA: 'AS1234567',
          pharmacyName: 'Test Pharmacy',
          pharmacyDEA: 'BP1234567',
          paymentType: 'insurance',
        },
      ];

      const earlyRefills = detectEarlyRefills(prescriptions);
      expect(earlyRefills).toHaveLength(0);
    });
  });

  describe('createAlert', () => {
    it('should create alert with correct properties', () => {
      const alert = createAlert('high_mme', 'critical', {
        description: 'Daily MME of 120 exceeds threshold',
        metrics: { dailyMME: 120 },
      });

      expect(alert.id).toMatch(/^ALERT-/);
      expect(alert.type).toBe('high_mme');
      expect(alert.severity).toBe('critical');
      expect(alert.title).toBe('High MME');
      expect(alert.requiresAction).toBe(true);
    });

    it('should not require action for non-critical alerts', () => {
      const alert = createAlert('cash_only', 'info');

      expect(alert.requiresAction).toBe(false);
    });
  });

  describe('analyzeResults', () => {
    it('should generate alerts for risky patterns', () => {
      const prescriptions = generateRiskyPrescriptionHistory();
      const analysis = analyzeResults(prescriptions);

      expect(analysis.alerts.length).toBeGreaterThan(0);
      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(['low', 'moderate', 'high', 'critical']).toContain(analysis.riskLevel);
    });

    it('should return low risk for clean history', () => {
      const prescriptions = [createMockPrescription()];
      const analysis = analyzeResults(prescriptions);

      expect(analysis.riskLevel).toBe('low');
      expect(analysis.riskScore).toBeLessThan(20);
    });
  });

  describe('createPDMPResult', () => {
    it('should create complete PDMP result', () => {
      const query: PDMPQuery = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientDOB: new Date('1980-01-15'),
        patientState: 'CA',
        pharmacyDEA: 'BP1234567',
        pharmacyNPI: '1234567890',
        requestedBy: 'user123',
        requestedByRole: 'pharmacist',
        requestReason: 'dispensing',
      };

      const prescriptions = [createMockPrescription()];

      const result = createPDMPResult(query, prescriptions, {
        provider: 'bamboo_health',
        source: 'state',
        statesQueried: ['CA'],
        statesResponded: ['CA'],
        patientMatched: true,
        matchConfidence: 95,
      });

      expect(result.queryId).toMatch(/^PDMP-/);
      expect(result.status).toBe('completed');
      expect(result.provider).toBe('bamboo_health');
      expect(result.totalPrescriptions).toBe(1);
      expect(result.patientMatched).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should mark alert as acknowledged', () => {
      const alert = createAlert('multiple_prescribers', 'warning');
      const acknowledged = acknowledgeAlert(alert, 'pharmacist123', 'Verified with patient');

      expect(acknowledged.acknowledgedBy).toBe('pharmacist123');
      expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledged.acknowledgeNotes).toBe('Verified with patient');
      expect(acknowledged.requiresAction).toBe(false);
    });
  });

  describe('markResultReviewed', () => {
    it('should mark result as reviewed', () => {
      const query: PDMPQuery = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientDOB: new Date('1980-01-15'),
        patientState: 'CA',
        pharmacyDEA: 'BP1234567',
        pharmacyNPI: '1234567890',
        requestedBy: 'user123',
        requestedByRole: 'pharmacist',
        requestReason: 'dispensing',
      };

      const result = createPDMPResult(query, [], {
        provider: 'bamboo_health',
        source: 'state',
        statesQueried: ['CA'],
        statesResponded: ['CA'],
        patientMatched: true,
      });

      const reviewed = markResultReviewed(result, 'pharmacist123', 'approve', 'Clean history');

      expect(reviewed.reviewedBy).toBe('pharmacist123');
      expect(reviewed.reviewDecision).toBe('approve');
      expect(reviewed.reviewNotes).toBe('Clean history');
      expect(reviewed.requiresPharmacistReview).toBe(false);
    });
  });

  describe('isPDMPQueryRequired', () => {
    it('should require query for Schedule II', () => {
      expect(isPDMPQueryRequired('II')).toBe(true);
      expect(isPDMPQueryRequired('C-II')).toBe(true);
    });

    it('should require query for Schedule III-V', () => {
      expect(isPDMPQueryRequired('III')).toBe(true);
      expect(isPDMPQueryRequired('IV')).toBe(true);
      expect(isPDMPQueryRequired('V')).toBe(true);
    });

    it('should not require query for non-controlled', () => {
      expect(isPDMPQueryRequired(undefined)).toBe(false);
      expect(isPDMPQueryRequired('')).toBe(false);
    });
  });

  describe('Filter Functions', () => {
    const now = new Date();
    const prescriptions: PDMPPrescription[] = [
      createMockPrescription({
        dispensedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        deaSchedule: 'II',
        prescriberDEA: 'AS1234567',
        pharmacyDEA: 'AP1234567',
      }),
      createMockPrescription({
        dispensedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        deaSchedule: 'III',
        prescriberDEA: 'BS1234567',
        pharmacyDEA: 'BP1234567',
      }),
      createMockPrescription({
        dispensedDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        deaSchedule: 'IV',
        prescriberDEA: 'AS1234567',
        pharmacyDEA: 'CP1234567',
      }),
    ];

    it('should filter by date range', () => {
      const startDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      const endDate = now;
      const filtered = filterByDateRange(prescriptions, startDate, endDate);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by schedule', () => {
      const filtered = filterBySchedule(prescriptions, ['II', 'III']);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by prescriber', () => {
      const filtered = filterByPrescriber(prescriptions, 'AS1234567');
      expect(filtered).toHaveLength(2);
    });

    it('should filter by pharmacy', () => {
      const filtered = filterByPharmacy(prescriptions, 'AP1234567');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('formatPDMPSummary', () => {
    it('should format result summary', () => {
      const query: PDMPQuery = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientDOB: new Date('1980-01-15'),
        patientState: 'CA',
        pharmacyDEA: 'BP1234567',
        pharmacyNPI: '1234567890',
        requestedBy: 'user123',
        requestedByRole: 'pharmacist',
        requestReason: 'dispensing',
      };

      const result = createPDMPResult(query, [createMockPrescription()], {
        provider: 'bamboo_health',
        source: 'state',
        statesQueried: ['CA'],
        statesResponded: ['CA'],
        patientMatched: true,
      });

      const summary = formatPDMPSummary(result);

      expect(summary).toContain('PDMP QUERY RESULTS');
      expect(summary).toContain('RISK ASSESSMENT');
      expect(summary).toContain('STATISTICS');
    });
  });

  describe('Schema Validation', () => {
    it('should validate PDMP query schema', () => {
      const validQuery = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientDOB: new Date('1980-01-15'),
        patientState: 'CA',
        pharmacyDEA: 'BP1234567',
        pharmacyNPI: '1234567890',
        requestedBy: 'user123',
        requestedByRole: 'pharmacist',
        requestReason: 'dispensing',
      };

      const result = PDMPQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject invalid state code', () => {
      const invalidQuery = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientDOB: new Date('1980-01-15'),
        patientState: 'CAL', // Invalid - should be 2 chars
        pharmacyDEA: 'BP1234567',
        pharmacyNPI: '1234567890',
        requestedBy: 'user123',
        requestedByRole: 'pharmacist',
        requestReason: 'dispensing',
      };

      const result = PDMPQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have MME conversion factors', () => {
      expect(MME_CONVERSION_FACTORS.hydrocodone).toBe(1);
      expect(MME_CONVERSION_FACTORS.oxycodone).toBe(1.5);
      expect(MME_CONVERSION_FACTORS.morphine).toBe(1);
    });

    it('should have MME thresholds', () => {
      expect(MME_THRESHOLDS.WARNING).toBe(50);
      expect(MME_THRESHOLDS.DANGER).toBe(90);
      expect(MME_THRESHOLDS.CRITICAL).toBe(120);
    });

    it('should have pattern thresholds', () => {
      expect(PATTERN_THRESHOLDS.PRESCRIBER_COUNT).toBe(4);
      expect(PATTERN_THRESHOLDS.PHARMACY_COUNT).toBe(4);
    });

    it('should have alert info for all alert types', () => {
      expect(PDMP_ALERT_INFO.early_refill).toBeDefined();
      expect(PDMP_ALERT_INFO.multiple_prescribers).toBeDefined();
      expect(PDMP_ALERT_INFO.high_mme).toBeDefined();
    });
  });
});

// Helper Functions
function createMockPrescription(overrides: Partial<PDMPPrescription> = {}): PDMPPrescription {
  return {
    dispensedDate: new Date(),
    drugName: 'Hydrocodone 10mg',
    deaSchedule: 'II',
    quantity: 60,
    daysSupply: 30,
    refillNumber: 0,
    prescriberName: 'Dr. Smith',
    prescriberDEA: 'AS1234567',
    pharmacyName: 'Test Pharmacy',
    pharmacyDEA: 'BP1234567',
    paymentType: 'insurance',
    ...overrides,
  };
}

function generateRiskyPrescriptionHistory(): PDMPPrescription[] {
  const now = new Date();
  const prescriptions: PDMPPrescription[] = [];

  // Multiple prescribers
  for (let i = 0; i < 5; i++) {
    prescriptions.push(
      createMockPrescription({
        dispensedDate: new Date(now.getTime() - i * 15 * 24 * 60 * 60 * 1000),
        prescriberName: `Dr. Prescriber${i}`,
        prescriberDEA: `A${i}1234567`,
        pharmacyName: `Pharmacy ${i}`,
        pharmacyDEA: `B${i}1234567`,
        paymentType: i % 2 === 0 ? 'cash' : 'insurance',
      })
    );
  }

  return prescriptions;
}
