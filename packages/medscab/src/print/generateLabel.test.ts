import { describe, it, expect } from 'vitest';
import { generateLabel, generatePDFLabel } from './generateLabel';

describe('Label Generation', () => {
  const mockData = {
    rxNumber: 'RX12345',
    patientName: 'John Doe',
    drugName: 'Lisinopril',
    strength: '10mg',
    directions: 'Take 1 tablet by mouth daily',
    quantity: 30,
    refills: 3,
    fillDate: new Date('2024-01-15'),
    prescriber: 'Dr. Smith',
    pharmacyName: 'Test Pharmacy',
    pharmacyPhone: '555-1234',
  };

  describe('generateLabel', () => {
    it('generates ZPL format', () => {
      const zpl = generateLabel(mockData);
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
      expect(zpl).toContain('RX12345');
      expect(zpl).toContain('John Doe');
    });

    it('includes controlled substance warning', () => {
      const zpl = generateLabel({ ...mockData, isControlled: true });
      expect(zpl).toContain('CONTROLLED SUBSTANCE');
    });

    it('includes NDC and lot', () => {
      const zpl = generateLabel({
        ...mockData,
        ndc: '12345-678-90',
        lotNumber: 'LOT123',
      });
      expect(zpl).toContain('12345-678-90');
      expect(zpl).toContain('LOT123');
    });
  });

  describe('generatePDFLabel', () => {
    it('generates HTML format', () => {
      const html = generatePDFLabel(mockData);
      expect(html).toContain('RX12345');
      expect(html).toContain('John Doe');
      expect(html).toContain('Lisinopril');
    });

    it('includes auxiliary labels', () => {
      const html = generatePDFLabel({
        ...mockData,
        auxiliaryLabels: ['Take with food', 'May cause drowsiness'],
      });
      expect(html).toContain('Take with food');
      expect(html).toContain('May cause drowsiness');
    });
  });
});
