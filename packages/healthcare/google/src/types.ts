import type { Bundle, Resource, Patient, Observation, Encounter, MedicationRequest } from 'fhir/r4';

export interface GoogleHealthcareConfig {
  projectId: string;
  location: string;
  datasetId: string;
  fhirStoreId: string;
  serviceAccountEmail: string;
  privateKeyId: string;
  privateKey: string;
}

export interface GoogleHealthcareCredentials {
  projectId: string;
  location: string;
  datasetId: string;
  fhirStoreId: string;
  accessToken: string;
  expiresAt: Date;
}

export type FhirResourceType =
  | 'Patient'
  | 'Observation'
  | 'Encounter'
  | 'MedicationRequest'
  | 'Condition'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'AllergyIntolerance'
  | 'Immunization';

export interface CreateResourceOptions {
  resourceType: FhirResourceType;
  resource: Resource;
}

export interface GetResourceOptions {
  resourceType: FhirResourceType;
  resourceId?: string;
  queryParams?: Record<string, string>;
}

export interface UpdateResourceOptions {
  resourceType: FhirResourceType;
  resourceId: string;
  resource: Resource;
}

export interface SearchResourceOptions {
  resourceType: FhirResourceType;
  queryParams?: Record<string, string>;
  pageSize?: number;
  pageToken?: string;
}

export interface DeleteResourceOptions {
  resourceType: FhirResourceType;
  resourceId: string;
}

export interface GoogleHealthcareResponse<T = Resource> {
  success: boolean;
  data?: T;
  error?: GoogleHealthcareError;
}

export interface GoogleHealthcareError {
  code: number;
  message: string;
  status: string;
  details?: Record<string, unknown>;
}

export interface SearchResult {
  bundle: Bundle;
  total: number;
  nextPageToken?: string;
}

export interface SyncResult {
  resourceType: FhirResourceType;
  localId: string;
  googleId: string;
  action: 'created' | 'updated' | 'unchanged';
  timestamp: Date;
}

// Re-export FHIR types for convenience
export type { Bundle, Resource, Patient, Observation, Encounter, MedicationRequest };
