import { describe, it, expect } from 'vitest';
import { canRefill, validateFillForVerification, getRecommendedAuxiliaryLabels } from '@xoai/medscab';

describe('Fill Router', () => {
  describe('canRefill', () => {
    it('allows refill when eligible', () => {
      const result = canRefill({
        refillsRemaining: 3,
        writtenDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        lastFillDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        daysSupply: 30,
      });
      expect(result.canRefill).toBe(true);
    });

    it('blocks refill too soon', () => {
      const result = canRefill({
        refillsRemaining: 3,
        writtenDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        lastFillDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        daysSupply: 30,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('blocks C2 refills', () => {
      const result = canRefill({
        deaSchedule: 'II',
        refillsRemaining: 1,
        writtenDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        daysSupply: 30,
      });
      expect(result.canRefill).toBe(false);
    });
  });

  describe('validateFillForVerification', () => {
    it('requires lot number and expiration', () => {
      const fill = {
        id: '1',
        prescriptionId: '1',
        rxNumber: 'RX001',
        fillNumber: 1,
        fillDate: new Date(),
        patientId: '1',
        patientName: 'Test',
        drugName: 'Test Drug',
        dispensedNdc: '12345678901',
        strength: '10mg',
        dosageForm: 'TAB',
        quantityPrescribed: 30,
        quantityDispensed: 30,
        daysSupply: 30,
        directions: 'Take 1 daily',
        dawCode: 0,
        isPartialFill: false,
        enteredBy: 'user1',
        filledBy: 'user1',
        enteredAt: new Date(),
        status: 'filled' as const,
        verificationStatus: 'pending' as const,
        packagingType: 'vial' as const,
        labelCount: 1,
        auxiliaryLabels: [],
        acquisitionCost: 10,
        dispensingFee: 5,
        grossPrice: 15,
        deliveryMethod: 'pickup' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validateFillForVerification(fill);
      expect(result.warnings.some(w => w.includes('Lot number'))).toBe(true);
    });
  });

  describe('getRecommendedAuxiliaryLabels', () => {
    it('recommends controlled substance label', () => {
      const labels = getRecommendedAuxiliaryLabels('Hydrocodone', undefined, true);
      expect(labels).toContain('CONTROLLED_SUBSTANCE');
    });

    it('recommends antibiotic labels', () => {
      const labels = getRecommendedAuxiliaryLabels('Amoxicillin', 'antibiotic');
      expect(labels).toContain('COMPLETE_ENTIRE_COURSE');
    });
  });
});
