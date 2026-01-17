import { describe, it, expect } from 'vitest';
import {
  OVERRIDE_CODES,
  getRejectCodeResolution,
  calculateEligibleRefillDate,
  calculateCashPrice,
  comparePricingOptions,
  isPriorAuthValid,
  getDaysUntilPAExpiration,
  type PriorAuthRequest,
} from './claim-adjudication';

describe('Claim Adjudication Module', () => {
  describe('OVERRIDE_CODES', () => {
    it('should define DUR override codes', () => {
      expect(OVERRIDE_CODES.DUR).toBeDefined();
      expect(OVERRIDE_CODES.DUR.length).toBeGreaterThan(0);
    });

    it('should define early refill override codes', () => {
      expect(OVERRIDE_CODES.EARLY_REFILL).toBeDefined();
      expect(OVERRIDE_CODES.EARLY_REFILL.find(o => o.code === 'VS')).toBeDefined(); // Vacation supply
    });

    it('should define quantity limit override codes', () => {
      expect(OVERRIDE_CODES.QUANTITY).toBeDefined();
      expect(OVERRIDE_CODES.QUANTITY.find(o => o.code === 'QL')).toBeDefined();
    });

    it('should have documentation flags for override codes', () => {
      const durOverride = OVERRIDE_CODES.DUR.find(o => o.code === 'M0');
      expect(durOverride?.requiresDocumentation).toBe(true);

      const vacationOverride = OVERRIDE_CODES.EARLY_REFILL.find(o => o.code === 'VS');
      expect(vacationOverride?.requiresDocumentation).toBe(false);
    });
  });

  describe('getRejectCodeResolution', () => {
    it('should return resolution for code 70 (Not Covered)', () => {
      const resolution = getRejectCodeResolution('70');

      expect(resolution).not.toBeNull();
      expect(resolution?.code).toBe('70');
      expect(resolution?.commonCauses).toContain('Drug not on formulary');
      expect(resolution?.requiresPharmacist).toBe(true);
      expect(resolution?.canOverride).toBe(false);
    });

    it('should return resolution for code 75 (Prior Auth Required)', () => {
      const resolution = getRejectCodeResolution('75');

      expect(resolution).not.toBeNull();
      expect(resolution?.code).toBe('75');
      expect(resolution?.resolutionSteps).toContain('Submit prior auth request to PBM');
      expect(resolution?.canOverride).toBe(true);
    });

    it('should return resolution for code 76 (Plan Limitations)', () => {
      const resolution = getRejectCodeResolution('76');

      expect(resolution).not.toBeNull();
      expect(resolution?.requiresPharmacist).toBe(false);
      expect(resolution?.canOverride).toBe(true);
    });

    it('should return resolution for code 79 (Refill Too Soon)', () => {
      const resolution = getRejectCodeResolution('79');

      expect(resolution).not.toBeNull();
      expect(resolution?.resolutionSteps).toContain('Calculate eligible refill date');
      expect(resolution?.overrideCodes).toEqual(OVERRIDE_CODES.EARLY_REFILL);
    });

    it('should return resolution for code 88 (DUR Reject)', () => {
      const resolution = getRejectCodeResolution('88');

      expect(resolution).not.toBeNull();
      expect(resolution?.requiresPharmacist).toBe(true);
      expect(resolution?.canOverride).toBe(true);
      expect(resolution?.overrideCodes).toEqual(OVERRIDE_CODES.DUR);
    });

    it('should return fallback for unknown codes', () => {
      const resolution = getRejectCodeResolution('999');

      expect(resolution).toBeNull();
    });

    it('should return resolution for code 7 (Member ID Invalid)', () => {
      const resolution = getRejectCodeResolution('7');

      expect(resolution).not.toBeNull();
      expect(resolution?.commonCauses).toContain('Member ID does not match plan records');
      expect(resolution?.canOverride).toBe(false);
    });

    it('should return resolution for code 65 (Patient Not Covered)', () => {
      const resolution = getRejectCodeResolution('65');

      expect(resolution).not.toBeNull();
      expect(resolution?.resolutionSteps).toContain('Verify patient eligibility dates');
    });
  });

  describe('calculateEligibleRefillDate', () => {
    it('should calculate eligible date at 80% by default', () => {
      const lastFillDate = new Date();
      lastFillDate.setDate(lastFillDate.getDate() - 20); // 20 days ago

      const result = calculateEligibleRefillDate(lastFillDate, 30);

      // 30 days * 80% = 24 days from last fill
      // We're at day 20, so 4 more days
      expect(result.daysUntilEligible).toBe(4);
      expect(result.isEligible).toBe(false);
    });

    it('should return isEligible true when past 80%', () => {
      const lastFillDate = new Date();
      lastFillDate.setDate(lastFillDate.getDate() - 25); // 25 days ago

      const result = calculateEligibleRefillDate(lastFillDate, 30);

      expect(result.isEligible).toBe(true);
      expect(result.daysUntilEligible).toBe(0);
    });

    it('should use custom percentage', () => {
      const lastFillDate = new Date();
      lastFillDate.setDate(lastFillDate.getDate() - 25); // 25 days ago

      const result = calculateEligibleRefillDate(lastFillDate, 30, 90);

      // 30 days * 90% = 27 days from last fill
      // We're at day 25, so 2 more days
      expect(result.daysUntilEligible).toBe(2);
      expect(result.isEligible).toBe(false);
      expect(result.percentageRequired).toBe(90);
    });

    it('should include last fill date and days supply in result', () => {
      const lastFillDate = new Date('2024-01-01');

      const result = calculateEligibleRefillDate(lastFillDate, 30);

      expect(result.lastFillDate).toEqual(lastFillDate);
      expect(result.daysSupply).toBe(30);
    });
  });

  describe('calculateCashPrice', () => {
    it('should calculate price with default markup', () => {
      const result = calculateCashPrice(10, 5);

      // ACQ: $10, Markup 20%: $2, Dispensing: $5 = $17
      expect(result.acquisitionCost).toBe(10);
      expect(result.markup).toBe(2);
      expect(result.dispensingFee).toBe(5);
      expect(result.finalPrice).toBe(17);
    });

    it('should use custom markup percentage', () => {
      const result = calculateCashPrice(10, 5, 50);

      // ACQ: $10, Markup 50%: $5, Dispensing: $5 = $20
      expect(result.markup).toBe(5);
      expect(result.finalPrice).toBe(20);
    });

    it('should enforce minimum price', () => {
      const result = calculateCashPrice(1, 1, 20, 10);

      // Calculated: $1 + $0.20 + $1 = $2.20, but minimum is $10
      expect(result.calculatedPrice).toBe(2.2);
      expect(result.finalPrice).toBe(10);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateCashPrice(10.33, 4.99, 15);

      expect(result.finalPrice).toBe(Math.round((10.33 + 10.33 * 0.15 + 4.99) * 100) / 100);
    });
  });

  describe('comparePricingOptions', () => {
    it('should recommend cash when cheaper', () => {
      const result = comparePricingOptions(25, 15);

      expect(result.recommendCash).toBe(true);
      expect(result.savings).toBe(10);
      expect(result.recommendation).toContain('cash price is $10.00 cheaper');
    });

    it('should recommend insurance when cheaper', () => {
      const result = comparePricingOptions(15, 25);

      expect(result.recommendCash).toBe(false);
      expect(result.savings).toBe(10);
      expect(result.recommendation).toContain('Insurance saves patient $10.00');
    });

    it('should handle equal prices', () => {
      const result = comparePricingOptions(20, 20);

      expect(result.recommendCash).toBe(false);
      expect(result.savings).toBe(0);
      expect(result.recommendation).toBe('Prices are equal');
    });

    it('should recommend cash when insurance not available', () => {
      const result = comparePricingOptions(null, 15);

      expect(result.recommendCash).toBe(true);
      expect(result.insurancePatientPay).toBeNull();
      expect(result.recommendation).toContain('Insurance not available');
    });
  });

  describe('isPriorAuthValid', () => {
    it('should return true for approved PA with future expiration', () => {
      const pa = createMockPriorAuth('approved');
      pa.expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      expect(isPriorAuthValid(pa)).toBe(true);
    });

    it('should return false for approved PA with past expiration', () => {
      const pa = createMockPriorAuth('approved');
      pa.expirationDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      expect(isPriorAuthValid(pa)).toBe(false);
    });

    it('should return false for non-approved PA', () => {
      const pa = createMockPriorAuth('pending_info');

      expect(isPriorAuthValid(pa)).toBe(false);
    });

    it('should return true for approved PA without expiration', () => {
      const pa = createMockPriorAuth('approved');
      pa.expirationDate = null;

      expect(isPriorAuthValid(pa)).toBe(true);
    });
  });

  describe('getDaysUntilPAExpiration', () => {
    it('should calculate days remaining', () => {
      const pa = createMockPriorAuth('approved');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      pa.expirationDate = futureDate;

      const days = getDaysUntilPAExpiration(pa);

      expect(days).toBeGreaterThanOrEqual(14);
      expect(days).toBeLessThanOrEqual(16);
    });

    it('should return 0 for expired PA', () => {
      const pa = createMockPriorAuth('approved');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      pa.expirationDate = pastDate;

      const days = getDaysUntilPAExpiration(pa);

      expect(days).toBe(0);
    });

    it('should return null when no expiration date', () => {
      const pa = createMockPriorAuth('approved');
      pa.expirationDate = null;

      const days = getDaysUntilPAExpiration(pa);

      expect(days).toBeNull();
    });
  });
});

// Helper function
function createMockPriorAuth(status: PriorAuthRequest['status']): PriorAuthRequest {
  return {
    id: 'PA-001',
    prescriptionId: 'RX-001',
    patientId: 'PAT-001',
    insurancePlanId: 'INS-001',
    drugNdc: '12345678901',
    drugName: 'Test Drug',
    prescriberId: 'PRES-001',
    prescriberName: 'Dr. Test',
    prescriberNpi: '1234567893',
    prescriberPhone: '555-1234',
    prescriberFax: '555-1235',
    diagnosis: null,
    icd10Codes: [],
    previousTherapies: [],
    clinicalNotes: null,
    status,
    submittedAt: null,
    approvedAt: status === 'approved' ? new Date() : null,
    deniedAt: status === 'denied' ? new Date() : null,
    expirationDate: null,
    authorizationNumber: status === 'approved' ? 'AUTH-12345' : null,
    authorizedQuantity: null,
    authorizedRefills: null,
    denialReason: null,
    appealDeadline: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
