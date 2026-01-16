import type {
  GoogleHealthcareConfig,
  GoogleHealthcareResponse,
  CreateResourceOptions,
  GetResourceOptions,
  UpdateResourceOptions,
  SearchResourceOptions,
  DeleteResourceOptions,
  SearchResult,
  SyncResult,
  Resource,
  Bundle,
  Patient,
  Observation,
  Encounter,
  MedicationRequest,
  FhirResourceType,
} from './types';
import { GoogleHealthcareClient, createClient } from './client';

/**
 * Create a new FHIR resource in Google Healthcare
 */
export async function createResource(
  config: GoogleHealthcareConfig,
  options: CreateResourceOptions
): Promise<GoogleHealthcareResponse<Resource>> {
  const client = createClient(config);
  return client.post(options.resourceType, options.resource);
}

/**
 * Get a FHIR resource from Google Healthcare
 */
export async function getResource(
  config: GoogleHealthcareConfig,
  options: GetResourceOptions
): Promise<GoogleHealthcareResponse<Resource>> {
  const client = createClient(config);
  return client.get(options.resourceType, options.resourceId, options.queryParams);
}

/**
 * Update a FHIR resource in Google Healthcare
 */
export async function updateResource(
  config: GoogleHealthcareConfig,
  options: UpdateResourceOptions
): Promise<GoogleHealthcareResponse<Resource>> {
  const client = createClient(config);
  return client.put(options.resourceType, options.resourceId, options.resource);
}

/**
 * Delete a FHIR resource from Google Healthcare
 */
export async function deleteResource(
  config: GoogleHealthcareConfig,
  options: DeleteResourceOptions
): Promise<GoogleHealthcareResponse<void>> {
  const client = createClient(config);
  return client.delete(options.resourceType, options.resourceId);
}

/**
 * Search for FHIR resources in Google Healthcare
 */
export async function searchResources(
  config: GoogleHealthcareConfig,
  options: SearchResourceOptions
): Promise<GoogleHealthcareResponse<SearchResult>> {
  const client = createClient(config);

  const queryParams: Record<string, string> = {
    ...options.queryParams,
  };

  if (options.pageSize) {
    queryParams['_count'] = options.pageSize.toString();
  }

  if (options.pageToken) {
    queryParams['_page_token'] = options.pageToken;
  }

  const response = await client.get<Bundle>(options.resourceType, undefined, queryParams);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error,
    };
  }

  const bundle = response.data;
  const nextLink = bundle.link?.find((l) => l.relation === 'next');

  return {
    success: true,
    data: {
      bundle,
      total: bundle.total ?? bundle.entry?.length ?? 0,
      nextPageToken: nextLink?.url ? extractPageToken(nextLink.url) : undefined,
    },
  };
}

/**
 * Extract page token from URL
 */
function extractPageToken(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('_page_token') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sync a patient and related resources to Google Healthcare
 */
export async function syncPatientBundle(
  config: GoogleHealthcareConfig,
  bundle: Bundle
): Promise<GoogleHealthcareResponse<Bundle>> {
  const client = createClient(config);

  // Convert to transaction bundle
  const transactionBundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: bundle.entry?.map((entry) => {
      const resource = entry.resource;
      if (!resource) return entry;

      return {
        ...entry,
        request: {
          method: 'PUT',
          url: `${resource.resourceType}/${resource.id}`,
        },
      };
    }),
  };

  return client.executeBundle(transactionBundle);
}

/**
 * Get patient with all related resources from Google Healthcare
 */
export async function getPatientEverything(
  config: GoogleHealthcareConfig,
  patientId: string
): Promise<GoogleHealthcareResponse<Bundle>> {
  const client = createClient(config);
  return client.get<Bundle>('Patient', `${patientId}/$everything`);
}

// Typed resource operations for convenience

/**
 * Create a Patient resource
 */
export async function createPatient(
  config: GoogleHealthcareConfig,
  patient: Patient
): Promise<GoogleHealthcareResponse<Patient>> {
  return createResource(config, {
    resourceType: 'Patient',
    resource: patient,
  }) as Promise<GoogleHealthcareResponse<Patient>>;
}

/**
 * Get a Patient resource
 */
export async function getPatient(
  config: GoogleHealthcareConfig,
  patientId: string
): Promise<GoogleHealthcareResponse<Patient>> {
  return getResource(config, {
    resourceType: 'Patient',
    resourceId: patientId,
  }) as Promise<GoogleHealthcareResponse<Patient>>;
}

/**
 * Search for Patients
 */
export async function searchPatients(
  config: GoogleHealthcareConfig,
  queryParams: Record<string, string>
): Promise<GoogleHealthcareResponse<SearchResult>> {
  return searchResources(config, {
    resourceType: 'Patient',
    queryParams,
  });
}

/**
 * Create an Observation resource
 */
export async function createObservation(
  config: GoogleHealthcareConfig,
  observation: Observation
): Promise<GoogleHealthcareResponse<Observation>> {
  return createResource(config, {
    resourceType: 'Observation',
    resource: observation,
  }) as Promise<GoogleHealthcareResponse<Observation>>;
}

/**
 * Get Observations for a patient
 */
export async function getPatientObservations(
  config: GoogleHealthcareConfig,
  patientId: string,
  queryParams?: Record<string, string>
): Promise<GoogleHealthcareResponse<SearchResult>> {
  return searchResources(config, {
    resourceType: 'Observation',
    queryParams: {
      patient: patientId,
      ...queryParams,
    },
  });
}

/**
 * Create an Encounter resource
 */
export async function createEncounter(
  config: GoogleHealthcareConfig,
  encounter: Encounter
): Promise<GoogleHealthcareResponse<Encounter>> {
  return createResource(config, {
    resourceType: 'Encounter',
    resource: encounter,
  }) as Promise<GoogleHealthcareResponse<Encounter>>;
}

/**
 * Create a MedicationRequest resource
 */
export async function createMedicationRequest(
  config: GoogleHealthcareConfig,
  medicationRequest: MedicationRequest
): Promise<GoogleHealthcareResponse<MedicationRequest>> {
  return createResource(config, {
    resourceType: 'MedicationRequest',
    resource: medicationRequest,
  }) as Promise<GoogleHealthcareResponse<MedicationRequest>>;
}

/**
 * Batch sync multiple resources
 */
export async function batchSync(
  config: GoogleHealthcareConfig,
  resources: { resourceType: FhirResourceType; resource: Resource }[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const client = createClient(config);

  for (const { resourceType, resource } of resources) {
    const localId = resource.id || 'unknown';

    try {
      // Try to get existing resource
      const existing = await client.get(resourceType, localId);

      let action: SyncResult['action'];
      let googleId: string;

      if (existing.success && existing.data) {
        // Update existing
        const updateResult = await client.put(resourceType, localId, resource);
        if (updateResult.success && updateResult.data) {
          action = 'updated';
          googleId = updateResult.data.id || localId;
        } else {
          continue; // Skip failed updates
        }
      } else {
        // Create new
        const createResult = await client.post(resourceType, resource);
        if (createResult.success && createResult.data) {
          action = 'created';
          googleId = createResult.data.id || localId;
        } else {
          continue; // Skip failed creates
        }
      }

      results.push({
        resourceType,
        localId,
        googleId,
        action,
        timestamp: new Date(),
      });
    } catch (error) {
      // Log error but continue with other resources
      console.error(`Failed to sync ${resourceType}/${localId}:`, error);
    }
  }

  return results;
}
