import { describe, it, expect } from 'vitest';
import {
  patientInputSchema,
  observationInputSchema,
  encounterInputSchema,
  medicationInputSchema,
} from './validators';

describe('FHIR Validators', () => {
  describe('patientInputSchema', () => {
    it('should validate valid patient input', () => {
      const validPatient = {
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male' as const,
        email: 'john@example.com',
      };

      const result = patientInputSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should reject invalid gender', () => {
      const invalidPatient = {
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'invalid',
      };

      const result = patientInputSchema.safeParse(invalidPatient);
      expect(result.success).toBe(false);
    });

    it('should reject empty firstName', () => {
      const invalidPatient = {
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: '',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
      };

      const result = patientInputSchema.safeParse(invalidPatient);
      expect(result.success).toBe(false);
    });

    it('should validate optional email format', () => {
      const patientWithBadEmail = {
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
        email: 'not-an-email',
      };

      const result = patientInputSchema.safeParse(patientWithBadEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('observationInputSchema', () => {
    it('should validate valid observation input', () => {
      const validObservation = {
        id: 'obs-001',
        patientId: 'patient-123',
        code: '8480-6',
        display: 'Systolic BP',
        effectiveDate: new Date(),
        status: 'final' as const,
      };

      const result = observationInputSchema.safeParse(validObservation);
      expect(result.success).toBe(true);
    });

    it('should accept observation without optional status', () => {
      const observation = {
        id: 'obs-002',
        patientId: 'patient-123',
        code: '8867-4',
        display: 'Heart rate',
        effectiveDate: new Date(),
      };

      const result = observationInputSchema.safeParse(observation);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidObservation = {
        id: 'obs-003',
        patientId: 'patient-123',
        code: '8867-4',
        display: 'Heart rate',
        effectiveDate: new Date(),
        status: 'invalid-status',
      };

      const result = observationInputSchema.safeParse(invalidObservation);
      expect(result.success).toBe(false);
    });
  });

  describe('encounterInputSchema', () => {
    it('should validate valid encounter input', () => {
      const validEncounter = {
        id: 'enc-001',
        patientId: 'patient-123',
        type: 'AMB',
        status: 'finished' as const,
        startDate: new Date(),
      };

      const result = encounterInputSchema.safeParse(validEncounter);
      expect(result.success).toBe(true);
    });

    it('should reject invalid encounter status', () => {
      const invalidEncounter = {
        id: 'enc-001',
        patientId: 'patient-123',
        type: 'AMB',
        status: 'unknown',
        startDate: new Date(),
      };

      const result = encounterInputSchema.safeParse(invalidEncounter);
      expect(result.success).toBe(false);
    });
  });

  describe('medicationInputSchema', () => {
    it('should validate valid medication input', () => {
      const validMedication = {
        id: 'med-001',
        patientId: 'patient-123',
        rxnormCode: '197884',
        name: 'Lisinopril',
        dosage: '10mg',
        startDate: new Date(),
        status: 'active' as const,
      };

      const result = medicationInputSchema.safeParse(validMedication);
      expect(result.success).toBe(true);
    });

    it('should accept medication without optional fields', () => {
      const medication = {
        id: 'med-002',
        patientId: 'patient-123',
        name: 'Aspirin',
        startDate: new Date(),
      };

      const result = medicationInputSchema.safeParse(medication);
      expect(result.success).toBe(true);
    });
  });
});
