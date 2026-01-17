import { describe, it, expect } from 'vitest';
import {
  DUR_OVERRIDE_CODES,
  createVerificationChecklist,
  isChecklistComplete,
  parseNdcFromBarcode,
  verifyNdcMatch,
  createDurOverride,
  checkDurAlertsResolved,
  validateVerificationComplete,
  completeVerification,
  type VerificationSession,
  type VerificationChecklist,
  type DUROverrideRecord,
} from './verification-workflow';

describe('Verification Workflow Module', () => {
  describe('DUR_OVERRIDE_CODES', () => {
    it('should define prescriber consulted code', () => {
      expect(DUR_OVERRIDE_CODES.PRESCRIBER_CONSULTED?.code).toBe('M0');
    });

    it('should define patient consulted code', () => {
      expect(DUR_OVERRIDE_CODES.PATIENT_CONSULTED?.code).toBe('P0');
    });

    it('should define clinical judgment code', () => {
      expect(DUR_OVERRIDE_CODES.CLINICAL_JUDGMENT?.code).toBe('5A');
    });
  });

  describe('createVerificationChecklist', () => {
    it('should create checklist with all false values', () => {
      const checklist = createVerificationChecklist();

      expect(checklist.patientNameCorrect).toBe(false);
      expect(checklist.drugCorrect).toBe(false);
      expect(checklist.ndcVerified).toBe(false);
    });

    it('should set controlled substance fields to null for non-controlled', () => {
      const checklist = createVerificationChecklist(false);

      expect(checklist.deaScheduleVerified).toBeNull();
      expect(checklist.pdmpReviewed).toBeNull();
      expect(checklist.idRequirementNoted).toBeNull();
    });

    it('should set controlled substance fields to false for controlled', () => {
      const checklist = createVerificationChecklist(true);

      expect(checklist.deaScheduleVerified).toBe(false);
      expect(checklist.pdmpReviewed).toBe(false);
      expect(checklist.idRequirementNoted).toBe(false);
    });
  });

  describe('isChecklistComplete', () => {
    it('should return incomplete for empty checklist', () => {
      const checklist = createVerificationChecklist();

      const result = isChecklistComplete(checklist);

      expect(result.isComplete).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return complete for fully checked checklist', () => {
      const checklist = createCompleteChecklist();

      const result = isChecklistComplete(checklist);

      expect(result.isComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should generate errors for required unchecked items', () => {
      const checklist = createVerificationChecklist();
      checklist.patientNameCorrect = true;

      const result = isChecklistComplete(checklist);

      expect(result.errors.some(e => e.includes('Patient Dob'))).toBe(true);
      expect(result.errors.some(e => e.includes('Drug'))).toBe(true);
    });

    it('should generate warnings for optional unchecked items', () => {
      const checklist = createCompleteChecklist();
      checklist.lotNumberRecorded = false;
      checklist.auxiliaryLabelsCorrect = false;

      const result = isChecklistComplete(checklist);

      expect(result.isComplete).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should require DEA schedule verification for controlled substances', () => {
      const checklist = createCompleteChecklist(true);
      checklist.deaScheduleVerified = false;

      const result = isChecklistComplete(checklist);

      expect(result.isComplete).toBe(false);
      expect(result.errors.some(e => e.includes('DEA'))).toBe(true);
    });

    it('should require PDMP review for controlled substances', () => {
      const checklist = createCompleteChecklist(true);
      checklist.pdmpReviewed = false;

      const result = isChecklistComplete(checklist);

      expect(result.isComplete).toBe(false);
      expect(result.errors.some(e => e.includes('PDMP'))).toBe(true);
    });

    it('should allow skipping PDMP when specified', () => {
      const checklist = createCompleteChecklist(true);
      checklist.pdmpReviewed = false;

      const result = isChecklistComplete(checklist, { skipPdmp: true });

      expect(result.isComplete).toBe(true);
    });

    it('should count completed and total items', () => {
      const checklist = createVerificationChecklist();
      checklist.patientNameCorrect = true;
      checklist.patientDobCorrect = true;
      checklist.drugCorrect = true;

      const result = isChecklistComplete(checklist);

      expect(result.completedCount).toBe(3);
      expect(result.totalCount).toBeGreaterThan(result.completedCount);
    });
  });

  describe('parseNdcFromBarcode', () => {
    it('should parse UPC-A barcode (12 digits)', () => {
      const result = parseNdcFromBarcode('012345678901');

      expect(result.success).toBe(true);
      expect(result.ndc).toBe('01234567890');
      expect(result.format).toBe('UPC-A');
    });

    it('should parse direct NDC (11 digits)', () => {
      const result = parseNdcFromBarcode('12345678901');

      expect(result.success).toBe(true);
      expect(result.ndc).toBe('12345678901');
      expect(result.format).toBe('NDC');
    });

    it('should parse direct NDC (10 digits)', () => {
      const result = parseNdcFromBarcode('1234567890');

      expect(result.success).toBe(true);
      expect(result.ndc).toBe('01234567890');
      expect(result.format).toBe('NDC');
    });

    it('should parse NDC with dashes', () => {
      const result = parseNdcFromBarcode('12345-6789-01');

      expect(result.success).toBe(true);
      expect(result.ndc).toBe('12345678901');
      expect(result.format).toBe('NDC-formatted');
    });

    it('should parse GS1 DataMatrix barcode', () => {
      const result = parseNdcFromBarcode('0100312345678901'); // 01 + GTIN-14

      expect(result.success).toBe(true);
      expect(result.format).toBe('GS1-GTIN');
    });

    it('should fail for invalid barcode data', () => {
      const result = parseNdcFromBarcode('invalid');

      expect(result.success).toBe(false);
      expect(result.ndc).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should preserve raw data in result', () => {
      const result = parseNdcFromBarcode('12345678901');

      expect(result.rawData).toBe('12345678901');
    });
  });

  describe('verifyNdcMatch', () => {
    it('should return exact match for identical NDCs', () => {
      const result = verifyNdcMatch('12345678901', '12345678901');

      expect(result.matches).toBe(true);
      expect(result.matchType).toBe('exact');
    });

    it('should normalize and match NDCs with different formats', () => {
      const result = verifyNdcMatch('12345-6789-01', '12345678901');

      expect(result.matches).toBe(true);
      expect(result.matchType).toBe('exact');
    });

    it('should detect different manufacturers', () => {
      const result = verifyNdcMatch('11111678901', '22222678901');

      expect(result.matches).toBe(false);
      expect(result.matchType).toBe('none');
      expect(result.error).toContain('Different manufacturers');
    });

    it('should detect same manufacturer, different product', () => {
      const result = verifyNdcMatch('12345111101', '12345222201');

      expect(result.matches).toBe(false);
      expect(result.matchType).toBe('labeler_only');
      expect(result.error).toContain('different product');
    });

    it('should detect package size variant', () => {
      const result = verifyNdcMatch('12345678901', '12345678902');

      expect(result.matches).toBe(false);
      expect(result.matchType).toBe('package_variant');
    });

    it('should allow package variants when specified', () => {
      const result = verifyNdcMatch('12345678901', '12345678902', true);

      expect(result.matches).toBe(true);
      expect(result.matchType).toBe('package_variant');
      expect(result.warning).toContain('Different package size');
    });
  });

  describe('createDurOverride', () => {
    it('should create DUR override record', () => {
      const alert = {
        id: 'DUR-001',
        type: 'drug_interaction' as const,
        severity: 'high' as const,
        message: 'Drug-drug interaction detected',
      };

      const override = createDurOverride(
        alert,
        'M0',
        'Prescriber consulted and acknowledged',
        'RPH-001',
        'Dr. Pharmacist'
      );

      expect(override.durAlertId).toBe('DUR-001');
      expect(override.alertType).toBe('drug_interaction');
      expect(override.severity).toBe('high');
      expect(override.overrideCode).toBe('M0');
      expect(override.overrideReason).toBe('Prescriber consulted and acknowledged');
      expect(override.pharmacistId).toBe('RPH-001');
      expect(override.pharmacistName).toBe('Dr. Pharmacist');
      expect(override.overriddenAt).toBeInstanceOf(Date);
    });
  });

  describe('checkDurAlertsResolved', () => {
    it('should return allResolved true when no alerts', () => {
      const result = checkDurAlertsResolved([], []);

      expect(result.allResolved).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should return allResolved true when all alerts overridden', () => {
      const alerts = [
        { id: 'DUR-001', severity: 'high' as const, isOverridden: false },
        { id: 'DUR-002', severity: 'moderate' as const, isOverridden: false },
      ];

      const overrides: DUROverrideRecord[] = [
        createMockOverride('DUR-001'),
        createMockOverride('DUR-002'),
      ];

      const result = checkDurAlertsResolved(alerts, overrides);

      expect(result.allResolved).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should block proceed with unresolved high severity', () => {
      const alerts = [
        { id: 'DUR-001', severity: 'high' as const, isOverridden: false },
      ];

      const result = checkDurAlertsResolved(alerts, []);

      expect(result.allResolved).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.unresolvedCount.high).toBe(1);
      expect(result.message).toContain('High severity');
    });

    it('should allow proceed with unresolved moderate severity', () => {
      const alerts = [
        { id: 'DUR-001', severity: 'moderate' as const, isOverridden: false },
      ];

      const result = checkDurAlertsResolved(alerts, []);

      expect(result.allResolved).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.unresolvedCount.moderate).toBe(1);
      expect(result.message).toContain('Moderate severity');
    });

    it('should count unresolved by severity', () => {
      const alerts = [
        { id: 'DUR-001', severity: 'high' as const, isOverridden: false },
        { id: 'DUR-002', severity: 'high' as const, isOverridden: false },
        { id: 'DUR-003', severity: 'moderate' as const, isOverridden: false },
        { id: 'DUR-004', severity: 'low' as const, isOverridden: false },
      ];

      const result = checkDurAlertsResolved(alerts, []);

      expect(result.unresolvedCount.high).toBe(2);
      expect(result.unresolvedCount.moderate).toBe(1);
      expect(result.unresolvedCount.low).toBe(1);
    });

    it('should respect isOverridden flag on alert', () => {
      const alerts = [
        { id: 'DUR-001', severity: 'high' as const, isOverridden: true },
      ];

      const result = checkDurAlertsResolved(alerts, []);

      expect(result.allResolved).toBe(true);
    });
  });

  describe('validateVerificationComplete', () => {
    it('should fail for incomplete session', () => {
      const session = createMockSession();

      const result = validateVerificationComplete(session);

      expect(result.canComplete).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when NDC not verified', () => {
      const session = createMockSession();
      session.checklist = createCompleteChecklist();
      session.durAlertsReviewed = true;
      session.ndcVerified = false;

      const result = validateVerificationComplete(session);

      expect(result.canComplete).toBe(false);
      expect(result.errors.some(e => e.includes('NDC'))).toBe(true);
    });

    it('should fail when DUR not reviewed', () => {
      const session = createMockSession();
      session.checklist = createCompleteChecklist();
      session.ndcVerified = true;
      session.durAlertsReviewed = false;

      const result = validateVerificationComplete(session);

      expect(result.canComplete).toBe(false);
      expect(result.errors.some(e => e.includes('DUR'))).toBe(true);
    });

    it('should pass for complete session', () => {
      const session = createMockSession();
      session.checklist = createCompleteChecklist();
      session.ndcVerified = true;
      session.durAlertsReviewed = true;

      const result = validateVerificationComplete(session);

      expect(result.canComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should track checklist progress', () => {
      const session = createMockSession();
      session.checklist = createCompleteChecklist();
      session.ndcVerified = true;
      session.durAlertsReviewed = true;

      const result = validateVerificationComplete(session);

      expect(result.checklistProgress.percentage).toBe(100);
      expect(result.checklistProgress.completed).toBe(result.checklistProgress.total);
    });
  });

  describe('completeVerification', () => {
    it('should complete session with approved decision', () => {
      const session = createMockSession();

      const completed = completeVerification(session, 'approved', 'All verified');

      expect(completed.status).toBe('approved');
      expect(completed.decision).toBe('approved');
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.notes).toBe('All verified');
      expect(completed.checklistCompleted).toBe(true);
    });

    it('should complete session with rejected decision', () => {
      const session = createMockSession();

      const completed = completeVerification(session, 'rejected', undefined, 'Wrong drug dispensed');

      expect(completed.status).toBe('rejected');
      expect(completed.decision).toBe('rejected');
      expect(completed.rejectionReason).toBe('Wrong drug dispensed');
    });

    it('should throw error when rejecting without reason', () => {
      const session = createMockSession();

      expect(() => {
        completeVerification(session, 'rejected');
      }).toThrow('Rejection reason is required');
    });

    it('should complete session with returned_for_rework decision', () => {
      const session = createMockSession();

      const completed = completeVerification(session, 'returned_for_rework', 'Relabel required');

      expect(completed.status).toBe('returned');
      expect(completed.decision).toBe('returned_for_rework');
    });
  });
});

// Helper functions
function createMockSession(): VerificationSession {
  return {
    id: 'VS-001',
    prescriptionId: 'RX-001',
    fillId: 'FILL-001',
    pharmacistId: 'RPH-001',
    startedAt: new Date(),
    completedAt: null,
    status: 'in_progress',
    checklist: createVerificationChecklist(),
    checklistCompleted: false,
    ndcScanned: null,
    ndcVerified: false,
    scanTimestamp: null,
    durAlertsReviewed: false,
    durOverrides: [],
    decision: null,
    rejectionReason: null,
    notes: null,
  };
}

function createCompleteChecklist(isControlled: boolean = false): VerificationChecklist {
  return {
    patientNameCorrect: true,
    patientDobCorrect: true,
    patientAddressCorrect: true,
    patientAllergiesReviewed: true,
    prescriberCorrect: true,
    drugCorrect: true,
    strengthCorrect: true,
    dosageFormCorrect: true,
    quantityCorrect: true,
    daysSupplyCorrect: true,
    directionsCorrect: true,
    refillsCorrect: true,
    dawCodeCorrect: true,
    durAlertsReviewed: true,
    interactionsCleared: true,
    allergiesCleared: true,
    dosageAppropriate: true,
    duplicateTherapyCleared: true,
    ndcVerified: true,
    lotNumberRecorded: true,
    expirationValid: true,
    quantityInVialCorrect: true,
    labelCorrect: true,
    auxiliaryLabelsCorrect: true,
    packagingAppropriate: true,
    appearanceCorrect: true,
    deaScheduleVerified: isControlled ? true : null,
    pdmpReviewed: isControlled ? true : null,
    idRequirementNoted: isControlled ? true : null,
  };
}

function createMockOverride(durAlertId: string): DUROverrideRecord {
  return {
    durAlertId,
    alertType: 'drug_interaction',
    severity: 'high',
    alertMessage: 'Test alert',
    overrideCode: 'M0',
    overrideReason: 'Prescriber consulted',
    overriddenAt: new Date(),
    pharmacistId: 'RPH-001',
    pharmacistName: 'Dr. Pharmacist',
  };
}
