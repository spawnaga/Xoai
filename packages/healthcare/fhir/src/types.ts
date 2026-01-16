import type { Patient, Bundle, Observation, MedicationRequest, Encounter } from 'fhir/r4';

export type { Patient, Bundle, Observation, MedicationRequest, Encounter };

export interface FhirPatientInput {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface FhirObservationInput {
  id: string;
  patientId: string;
  code: string;
  codeSystem?: string;
  display: string;
  value?: string;
  unit?: string;
  effectiveDate: Date;
  status?: 'registered' | 'preliminary' | 'final' | 'amended' | 'cancelled';
}

export interface FhirEncounterInput {
  id: string;
  patientId: string;
  type: string;
  status: 'planned' | 'in-progress' | 'finished' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  reason?: string;
}

export interface FhirMedicationInput {
  id: string;
  patientId: string;
  rxnormCode?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status?: 'active' | 'completed' | 'stopped' | 'on-hold';
  startDate: Date;
  endDate?: Date;
}
