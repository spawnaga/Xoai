import { describe, it, expect } from 'vitest';
import {
  generateADT_A04,
  generateORU_R01,
  generateRDE_O11,
  generateACK,
} from './generator';
import type { PatientRegistration, ObservationResult, PharmacyOrder } from './types';

describe('HL7 Message Generators', () => {
  describe('generateADT_A04', () => {
    it('should generate valid ADT_A04 patient registration message', () => {
      const patient: PatientRegistration = {
        patientId: 'P12345',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'M',
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
        },
        phone: '555-1234',
      };

      const result = generateADT_A04(patient);

      // Check message structure
      expect(result).toContain('MSH|');
      expect(result).toContain('EVN|A04|');
      expect(result).toContain('PID|');
      expect(result).toContain('PV1|');

      // Check patient data
      expect(result).toContain('Doe^John');
      expect(result).toContain('P12345');
      expect(result).toContain('19900515');
      expect(result).toContain('|M|');
    });

    it('should handle patient without optional fields', () => {
      const patient: PatientRegistration = {
        patientId: 'P67890',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-03-20'),
        gender: 'F',
      };

      const result = generateADT_A04(patient);

      expect(result).toContain('MSH|');
      expect(result).toContain('Smith^Jane');
      expect(result).toContain('|F|');
    });

    it('should include message type ADT^A04', () => {
      const patient: PatientRegistration = {
        patientId: 'P11111',
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'U',
      };

      const result = generateADT_A04(patient);

      expect(result).toContain('ADT^A04');
    });
  });

  describe('generateORU_R01', () => {
    it('should generate valid ORU_R01 observation result message', () => {
      const result: ObservationResult = {
        patientId: 'P12345',
        orderId: 'ORD-001',
        observationId: 'OBS-001',
        observationCode: '8480-6',
        observationName: 'Systolic BP',
        value: '120',
        unit: 'mmHg',
        referenceRange: '90-140',
        abnormalFlag: 'N',
        observationDateTime: new Date('2024-01-15T10:30:00Z'),
        resultStatus: 'F',
      };

      const message = generateORU_R01(result);

      expect(message).toContain('MSH|');
      expect(message).toContain('ORU^R01');
      expect(message).toContain('PID|');
      expect(message).toContain('OBR|');
      expect(message).toContain('OBX|');
      expect(message).toContain('8480-6^Systolic BP');
      expect(message).toContain('120');
      expect(message).toContain('mmHg');
    });

    it('should handle high abnormal flag', () => {
      const result: ObservationResult = {
        patientId: 'P12345',
        orderId: 'ORD-002',
        observationId: 'OBS-002',
        observationCode: '2345-7',
        observationName: 'Glucose',
        value: '250',
        unit: 'mg/dL',
        abnormalFlag: 'H',
        observationDateTime: new Date(),
        resultStatus: 'F',
      };

      const message = generateORU_R01(result);

      expect(message).toContain('|H|');
    });
  });

  describe('generateRDE_O11', () => {
    it('should generate valid RDE_O11 pharmacy order message', () => {
      const order: PharmacyOrder = {
        patientId: 'P12345',
        orderId: 'RX-001',
        drugCode: '197884',
        drugName: 'Lisinopril 10mg',
        dosage: '10mg',
        route: 'PO',
        frequency: 'QD',
        quantity: 30,
        refills: 3,
        prescriberId: 'DR-001',
        prescriberName: 'Dr. Smith',
      };

      const message = generateRDE_O11(order);

      expect(message).toContain('MSH|');
      expect(message).toContain('RDE^O11');
      expect(message).toContain('PID|');
      expect(message).toContain('ORC|');
      expect(message).toContain('RXE|');
      expect(message).toContain('197884^Lisinopril 10mg');
      expect(message).toContain('10mg');
      expect(message).toContain('30');
    });

    it('should handle order without refills', () => {
      const order: PharmacyOrder = {
        patientId: 'P12345',
        orderId: 'RX-002',
        drugCode: '161',
        drugName: 'Acetaminophen 500mg',
        dosage: '500mg',
        route: 'PO',
        frequency: 'Q6H PRN',
        quantity: 20,
        prescriberId: 'DR-002',
        prescriberName: 'Dr. Jones',
      };

      const message = generateRDE_O11(order);

      expect(message).toContain('MSH|');
      expect(message).toContain('RXE|');
    });
  });

  describe('generateACK', () => {
    it('should generate positive acknowledgment', () => {
      const ack = generateACK('MSG12345', 'AA');

      expect(ack).toContain('MSH|');
      expect(ack).toContain('MSA|AA|MSG12345');
    });

    it('should generate negative acknowledgment with error', () => {
      const ack = generateACK('MSG12345', 'AE', 'Invalid patient ID');

      expect(ack).toContain('MSA|AE|MSG12345|Invalid patient ID');
    });

    it('should default to positive acknowledgment', () => {
      const ack = generateACK('MSG67890');

      expect(ack).toContain('MSA|AA|MSG67890');
    });
  });
});
