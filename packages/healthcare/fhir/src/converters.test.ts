import { describe, it, expect } from 'vitest';
import {
  patientToFhir,
  observationToFhir,
  encounterToFhir,
  medicationToFhir,
  createBundle,
} from './converters';
import type { FhirPatientInput, FhirObservationInput, FhirEncounterInput, FhirMedicationInput } from './types';

describe('FHIR Converters', () => {
  describe('patientToFhir', () => {
    it('should convert patient data to FHIR Patient resource', () => {
      const input: FhirPatientInput = {
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
        country: 'USA',
      };

      const result = patientToFhir(input);

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe('patient-123');
      expect(result.gender).toBe('male');
      expect(result.birthDate).toBe('1990-05-15');
      expect(result.name?.[0]?.family).toBe('Doe');
      expect(result.name?.[0]?.given?.[0]).toBe('John');
      expect(result.identifier?.[0]?.value).toBe('MRN-001');
    });

    it('should handle patient without optional fields', () => {
      const input: FhirPatientInput = {
        id: 'patient-456',
        mrn: 'MRN-002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-03-20'),
        gender: 'female',
      };

      const result = patientToFhir(input);

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe('patient-456');
      expect(result.telecom).toBeUndefined();
      expect(result.address).toBeUndefined();
    });

    it('should include telecom when email or phone provided', () => {
      const input: FhirPatientInput = {
        id: 'patient-789',
        mrn: 'MRN-003',
        firstName: 'Bob',
        lastName: 'Wilson',
        dateOfBirth: new Date('1975-08-10'),
        gender: 'male',
        email: 'bob@example.com',
      };

      const result = patientToFhir(input);

      expect(result.telecom).toBeDefined();
      expect(result.telecom?.length).toBe(1);
      expect(result.telecom?.[0]?.system).toBe('email');
      expect(result.telecom?.[0]?.value).toBe('bob@example.com');
    });
  });

  describe('observationToFhir', () => {
    it('should convert observation with quantity value', () => {
      const input: FhirObservationInput = {
        id: 'obs-001',
        patientId: 'patient-123',
        code: '8480-6',
        display: 'Systolic blood pressure',
        value: '120',
        unit: 'mmHg',
        effectiveDate: new Date('2024-01-15T10:30:00Z'),
        status: 'final',
      };

      const result = observationToFhir(input);

      expect(result.resourceType).toBe('Observation');
      expect(result.id).toBe('obs-001');
      expect(result.status).toBe('final');
      expect(result.code?.coding?.[0]?.code).toBe('8480-6');
      expect(result.subject?.reference).toBe('Patient/patient-123');
      expect(result.valueQuantity?.value).toBe(120);
      expect(result.valueQuantity?.unit).toBe('mmHg');
    });

    it('should convert observation with string value', () => {
      const input: FhirObservationInput = {
        id: 'obs-002',
        patientId: 'patient-123',
        code: '8310-5',
        display: 'Body temperature',
        value: 'Normal',
        effectiveDate: new Date('2024-01-15'),
      };

      const result = observationToFhir(input);

      expect(result.valueString).toBe('Normal');
      expect(result.valueQuantity).toBeUndefined();
    });

    it('should use default status when not provided', () => {
      const input: FhirObservationInput = {
        id: 'obs-003',
        patientId: 'patient-123',
        code: '8867-4',
        display: 'Heart rate',
        effectiveDate: new Date('2024-01-15'),
      };

      const result = observationToFhir(input);

      expect(result.status).toBe('final');
    });
  });

  describe('encounterToFhir', () => {
    it('should convert encounter data', () => {
      const input: FhirEncounterInput = {
        id: 'enc-001',
        patientId: 'patient-123',
        type: 'AMB',
        status: 'finished',
        startDate: new Date('2024-01-15T09:00:00Z'),
        endDate: new Date('2024-01-15T10:00:00Z'),
        reason: 'Annual checkup',
      };

      const result = encounterToFhir(input);

      expect(result.resourceType).toBe('Encounter');
      expect(result.id).toBe('enc-001');
      expect(result.status).toBe('finished');
      expect(result.class?.code).toBe('AMB');
      expect(result.subject?.reference).toBe('Patient/patient-123');
      expect(result.reasonCode?.[0]?.text).toBe('Annual checkup');
    });

    it('should handle encounter without end date', () => {
      const input: FhirEncounterInput = {
        id: 'enc-002',
        patientId: 'patient-456',
        type: 'IMP',
        status: 'in-progress',
        startDate: new Date('2024-01-15T14:00:00Z'),
      };

      const result = encounterToFhir(input);

      expect(result.period?.start).toBeDefined();
      expect(result.period?.end).toBeUndefined();
    });
  });

  describe('medicationToFhir', () => {
    it('should convert medication with RxNorm code', () => {
      const input: FhirMedicationInput = {
        id: 'med-001',
        patientId: 'patient-123',
        rxnormCode: '197884',
        name: 'Lisinopril 10mg',
        dosage: '10mg',
        frequency: 'Once daily',
        route: 'Oral',
        status: 'active',
        startDate: new Date('2024-01-01'),
      };

      const result = medicationToFhir(input);

      expect(result.resourceType).toBe('MedicationRequest');
      expect(result.id).toBe('med-001');
      expect(result.status).toBe('active');
      expect(result.medicationCodeableConcept?.coding?.[0]?.code).toBe('197884');
      expect(result.medicationCodeableConcept?.text).toBe('Lisinopril 10mg');
    });

    it('should handle medication without RxNorm code', () => {
      const input: FhirMedicationInput = {
        id: 'med-002',
        patientId: 'patient-123',
        name: 'Vitamin D Supplement',
        startDate: new Date('2024-01-01'),
      };

      const result = medicationToFhir(input);

      expect(result.medicationCodeableConcept?.coding).toBeUndefined();
      expect(result.medicationCodeableConcept?.text).toBe('Vitamin D Supplement');
    });
  });

  describe('createBundle', () => {
    it('should create a collection bundle from resources', () => {
      const patient = patientToFhir({
        id: 'patient-123',
        mrn: 'MRN-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
      });

      const observation = observationToFhir({
        id: 'obs-001',
        patientId: 'patient-123',
        code: '8480-6',
        display: 'Systolic BP',
        value: '120',
        unit: 'mmHg',
        effectiveDate: new Date(),
      });

      const bundle = createBundle([patient, observation]);

      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry?.length).toBe(2);
      expect(bundle.timestamp).toBeDefined();
    });

    it('should create bundle with custom type', () => {
      const bundle = createBundle([], 'transaction');

      expect(bundle.type).toBe('transaction');
    });
  });
});
