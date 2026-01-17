import { describe, it, expect } from 'vitest';
import { analyzePDMPResults as analyzeResults, calculateMME, MME_THRESHOLDS } from '@xoai/medscab';

describe('PDMP Router', () => {
  describe('analyzeResults', () => {
    it('detects low risk', () => {
      const result = analyzeResults([]);
      expect(result.riskLevel).toBe('low');
      expect(result.alerts.length).toBe(0);
    });

    it('detects multiple prescribers', () => {
      const prescriptions = [
        {
          dispensedDate: new Date(),
          drugName: 'Hydrocodone',
          deaSchedule: 'II',
          quantity: 30,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. A',
          prescriberDEA: 'AA1234563',
          pharmacyName: 'Pharmacy',
          pharmacyDEA: 'FA1234567',
          paymentType: 'insurance' as const,
        },
        {
          dispensedDate: new Date(),
          drugName: 'Oxycodone',
          deaSchedule: 'II',
          quantity: 30,
          daysSupply: 30,
          refillNumber: 0,
          prescriberName: 'Dr. B',
          prescriberDEA: 'AB1234563',
          pharmacyName: 'Pharmacy',
          pharmacyDEA: 'FA1234567',
          paymentType: 'insurance' as const,
        },
      ];
      const result = analyzeResults(prescriptions);
      expect(result.metrics.prescriberCount).toBe(2);
    });
  });

  describe('calculateMME', () => {
    it('calculates hydrocodone MME', () => {
      const result = calculateMME({
        drugName: 'Hydrocodone',
        strength: 10,
        strengthUnit: 'mg',
        quantity: 60,
        daysSupply: 30,
      });
      expect(result.dailyMME).toBe(20);
      expect(result.isHighDose).toBe(false);
    });

    it('detects high dose', () => {
      const result = calculateMME({
        drugName: 'Morphine',
        strength: 100,
        strengthUnit: 'mg',
        quantity: 60,
        daysSupply: 30,
      });
      expect(result.dailyMME).toBeGreaterThan(MME_THRESHOLDS.WARNING);
      expect(result.isHighDose).toBe(true);
    });
  });
});
