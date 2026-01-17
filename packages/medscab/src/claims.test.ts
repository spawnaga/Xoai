import { describe, it, expect } from 'vitest';
import {
  submitClaim,
  reverseClaim,
  checkEligibility,
  calculatePatientPay,
  getRejectCodeInfo,
  parseRejectCodes,
  REJECT_CODES,
  DAW_CODES,
  ClaimRequestSchema,
  InsuranceInfoSchema,
} from './claims';

describe('Claims Module', () => {
  describe('calculatePatientPay', () => {
    it('should calculate patient pay with copay only', () => {
      const result = calculatePatientPay(100, 65, 35, 0, 0);

      expect(result.totalCost).toBe(100);
      expect(result.insurancePaid).toBe(65);
      expect(result.patientPay).toBe(35);
      expect(result.breakdown.copay).toBe(35);
      expect(result.breakdown.deductible).toBe(0);
      expect(result.breakdown.coinsurance).toBe(0);
    });

    it('should apply deductible first', () => {
      const result = calculatePatientPay(100, 0, 20, 50, 0);

      expect(result.breakdown.deductible).toBe(50);
      expect(result.breakdown.copay).toBe(20);
      expect(result.patientPay).toBe(70);
    });

    it('should apply coinsurance after copay', () => {
      const result = calculatePatientPay(100, 50, 10, 0, 20);

      expect(result.breakdown.copay).toBe(10);
      // Remaining 90, coinsurance 20% = 18
      expect(result.breakdown.coinsurance).toBe(18);
      expect(result.patientPay).toBe(28);
    });

    it('should handle full deductible coverage', () => {
      const result = calculatePatientPay(100, 0, 20, 100, 0);

      expect(result.breakdown.deductible).toBe(100);
      expect(result.breakdown.copay).toBe(0);
      expect(result.patientPay).toBe(100);
    });

    it('should cap copay at remaining amount after deductible', () => {
      const result = calculatePatientPay(100, 0, 50, 80, 0);

      expect(result.breakdown.deductible).toBe(80);
      expect(result.breakdown.copay).toBe(20); // Only 20 remaining
      expect(result.patientPay).toBe(100);
    });
  });

  describe('getRejectCodeInfo', () => {
    it('should return reject code info for known codes', () => {
      const code70 = getRejectCodeInfo('70');
      expect(code70).toBeDefined();
      expect(code70?.description).toBe('Product/Service Not Covered');
      expect(code70?.category).toBe('coverage');
    });

    it('should handle case insensitivity', () => {
      const codeMR = getRejectCodeInfo('mr');
      expect(codeMR).toBeDefined();
      expect(codeMR?.code).toBe('MR');
    });

    it('should return undefined for unknown codes', () => {
      const unknown = getRejectCodeInfo('UNKNOWN');
      expect(unknown).toBeUndefined();
    });
  });

  describe('parseRejectCodes', () => {
    it('should parse multiple known codes', () => {
      const result = parseRejectCodes(['70', '75', '79']);

      expect(result).toHaveLength(3);
      expect(result[0]?.code).toBe('70');
      expect(result[1]?.code).toBe('75');
      expect(result[2]?.code).toBe('79');
    });

    it('should handle unknown codes gracefully', () => {
      const result = parseRejectCodes(['70', 'UNKNOWN']);

      expect(result).toHaveLength(2);
      expect(result[0]?.code).toBe('70');
      expect(result[1]?.code).toBe('UNKNOWN');
      expect(result[1]?.description).toContain('Unknown');
      expect(result[1]?.category).toBe('other');
    });
  });

  describe('REJECT_CODES', () => {
    it('should have common reject codes', () => {
      expect(REJECT_CODES['70']).toBeDefined(); // Not Covered
      expect(REJECT_CODES['75']).toBeDefined(); // Prior Auth Required
      expect(REJECT_CODES['76']).toBeDefined(); // Plan Limitations
      expect(REJECT_CODES['79']).toBeDefined(); // Refill Too Soon
      expect(REJECT_CODES['88']).toBeDefined(); // DUR Reject
    });

    it('should have actionRequired for all codes', () => {
      Object.values(REJECT_CODES).forEach(code => {
        expect(code.actionRequired).toBeDefined();
        expect(code.actionRequired.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DAW_CODES', () => {
    it('should have all standard DAW codes (0-9)', () => {
      for (let i = 0; i <= 9; i++) {
        expect(DAW_CODES[i]).toBeDefined();
      }
    });

    it('should have correct descriptions', () => {
      expect(DAW_CODES[0]).toBe('No Product Selection Indicated');
      expect(DAW_CODES[1]).toContain('Not Allowed by Prescriber');
      expect(DAW_CODES[2]).toContain('Patient Requested');
    });
  });

  describe('checkEligibility', () => {
    it('should return eligible for valid date range', async () => {
      const insurance = {
        bin: '123456',
        pcn: 'TEST',
        groupNumber: 'GRP001',
        memberId: 'MEM001',
        personCode: '01',
        cardholderName: 'Test Patient',
        relationshipCode: '01',
        effectiveDate: new Date('2024-01-01'),
        terminationDate: new Date('2025-12-31'),
      };

      const result = await checkEligibility(insurance, new Date('2024-06-15'));

      expect(result.eligible).toBe(true);
      expect(result.copayInfo).toBeDefined();
      expect(result.deductible).toBeDefined();
    });

    it('should return ineligible for date before effective date', async () => {
      const insurance = {
        bin: '123456',
        pcn: 'TEST',
        groupNumber: 'GRP001',
        memberId: 'MEM001',
        personCode: '01',
        cardholderName: 'Test Patient',
        relationshipCode: '01',
        effectiveDate: new Date('2024-06-01'),
      };

      const result = await checkEligibility(insurance, new Date('2024-05-15'));

      expect(result.eligible).toBe(false);
    });

    it('should return ineligible for date after termination', async () => {
      const insurance = {
        bin: '123456',
        pcn: 'TEST',
        groupNumber: 'GRP001',
        memberId: 'MEM001',
        personCode: '01',
        cardholderName: 'Test Patient',
        relationshipCode: '01',
        effectiveDate: new Date('2024-01-01'),
        terminationDate: new Date('2024-06-30'),
      };

      const result = await checkEligibility(insurance, new Date('2024-07-15'));

      expect(result.eligible).toBe(false);
    });
  });

  describe('submitClaim', () => {
    it('should reject invalid BIN format', async () => {
      const request = createValidClaimRequest();
      request.insurance.bin = '12345'; // Invalid: should be 6 digits

      const result = await submitClaim(request);

      expect(result.status).toBe('rejected');
      expect(result.rejectCodes?.some(r => r.description.includes('BIN'))).toBe(true);
    });

    it('should reject invalid NPI format', async () => {
      const request = createValidClaimRequest();
      request.pharmacy.npi = '12345'; // Invalid: should be 10 digits

      const result = await submitClaim(request);

      expect(result.status).toBe('rejected');
      expect(result.rejectCodes?.some(r => r.description.includes('NPI'))).toBe(true);
    });

    it('should reject zero quantity', async () => {
      const request = createValidClaimRequest();
      request.drug.quantity = 0;

      const result = await submitClaim(request);

      expect(result.status).toBe('rejected');
      expect(result.rejectCodes?.some(r => r.description.includes('quantity'))).toBe(true);
    });

    it('should reject invalid days supply', async () => {
      const request = createValidClaimRequest();
      request.drug.daysSupply = 400; // Invalid: max is 365

      const result = await submitClaim(request);

      expect(result.status).toBe('rejected');
    });

    it('should return a transaction ID for all submissions', async () => {
      const request = createValidClaimRequest();

      const result = await submitClaim(request);

      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^TXN-/);
    });
  });

  describe('reverseClaim', () => {
    it('should return reversed status', async () => {
      const result = await reverseClaim('ORIGINAL-123', 'Patient returned medication');

      expect(result.status).toBe('reversed');
      expect(result.responseCode).toBe('A');
      expect(result.message).toContain('ORIGINAL-123');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate correct insurance info', () => {
      const validInsurance = {
        bin: '123456',
        pcn: 'TEST',
        groupNumber: 'GRP001',
        memberId: 'MEM001',
        personCode: '01',
        cardholderName: 'Test Patient',
        relationshipCode: '01',
        effectiveDate: new Date(),
      };

      const result = InsuranceInfoSchema.safeParse(validInsurance);
      expect(result.success).toBe(true);
    });

    it('should reject invalid BIN length', () => {
      const invalidInsurance = {
        bin: '12345', // Should be 6
        pcn: 'TEST',
        groupNumber: 'GRP001',
        memberId: 'MEM001',
        personCode: '01',
        cardholderName: 'Test Patient',
        relationshipCode: '01',
        effectiveDate: new Date(),
      };

      const result = InsuranceInfoSchema.safeParse(invalidInsurance);
      expect(result.success).toBe(false);
    });
  });
});

// Helper function to create a valid claim request for testing
function createValidClaimRequest() {
  return {
    transactionType: 'B1' as const,
    prescriptionId: 'RX-001',
    fillId: 'FILL-001',
    pharmacy: {
      npi: '1234567890',
      ncpdpId: '1234567',
    },
    patient: {
      id: 'PAT-001',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'M' as const,
    },
    insurance: {
      bin: '123456',
      pcn: 'TEST',
      groupNumber: 'GRP001',
      memberId: 'MEM001',
      personCode: '01',
      cardholderName: 'John Doe',
      relationshipCode: '01',
      effectiveDate: new Date('2024-01-01'),
    },
    prescriber: {
      npi: '9876543210',
      lastName: 'Smith',
      firstName: 'Jane',
    },
    drug: {
      ndc: '12345678901',
      quantity: 30,
      daysSupply: 30,
      dawCode: 0,
    },
    pricing: {
      ingredientCost: 50,
      dispensingFee: 10,
      grossAmountDue: 60,
      usualAndCustomary: 75,
    },
  };
}
