import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GoogleHealthcareConfig } from './types';

console.log('Starting test suite...');

// Mock the client module
vi.mock('./client', () => ({
  createClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({
      success: true,
      data: { resourceType: 'Patient', id: 'test-123' },
    }),
    post: vi.fn().mockResolvedValue({
      success: true,
      data: { resourceType: 'Patient', id: 'new-123' },
    }),
    put: vi.fn().mockResolvedValue({
      success: true,
      data: { resourceType: 'Patient', id: 'test-123' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    executeBundle: vi.fn().mockResolvedValue({
      success: true,
      data: { resourceType: 'Bundle', type: 'transaction-response' },
    }),
  })),
}));

// Import after mocking
import {
  createResource,
  getResource,
  updateResource,
  deleteResource,
  searchResources,
  syncPatientBundle,
  getPatientEverything,
  createPatient,
  getPatient,
  searchPatients,
  createObservation,
  getPatientObservations,
  createEncounter,
  createMedicationRequest,
  batchSync,
} from './operations';
import { createClient } from './client';

const mockConfig: GoogleHealthcareConfig = {
  projectId: 'test-project',
  location: 'us-central1',
  datasetId: 'test-dataset',
  fhirStoreId: 'test-fhir-store',
  serviceAccountEmail: 'test@test-project.iam.gserviceaccount.com',
  privateKeyId: 'test-key-id',
  privateKey: 'test-private-key',
};

describe('Google Healthcare Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createResource', () => {
    it('should call client.post with correct parameters', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'new-123' },
      });
      (createClient as any).mockReturnValue({ post: mockPost });

      const result = await createResource(mockConfig, {
        resourceType: 'Patient',
        resource: { resourceType: 'Patient', name: [{ family: 'Test' }] },
      });

      expect(mockPost).toHaveBeenCalledWith('Patient', expect.any(Object));
      expect(result.success).toBe(true);
    });
  });

  describe('getResource', () => {
    it('should call client.get with correct parameters', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'test-123' },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      const result = await getResource(mockConfig, {
        resourceType: 'Patient',
        resourceId: 'test-123',
      });

      expect(mockGet).toHaveBeenCalledWith('Patient', 'test-123', undefined);
      expect(result.success).toBe(true);
    });

    it('should pass query parameters', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'test-123' },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await getResource(mockConfig, {
        resourceType: 'Patient',
        resourceId: 'test-123',
        queryParams: { _include: 'Patient:organization' },
      });

      expect(mockGet).toHaveBeenCalledWith('Patient', 'test-123', { _include: 'Patient:organization' });
    });
  });

  describe('updateResource', () => {
    it('should call client.put with correct parameters', async () => {
      const mockPut = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'test-123' },
      });
      (createClient as any).mockReturnValue({ put: mockPut });

      const result = await updateResource(mockConfig, {
        resourceType: 'Patient',
        resourceId: 'test-123',
        resource: { resourceType: 'Patient', id: 'test-123', name: [{ family: 'Updated' }] },
      });

      expect(mockPut).toHaveBeenCalledWith('Patient', 'test-123', expect.any(Object));
      expect(result.success).toBe(true);
    });
  });

  describe('deleteResource', () => {
    it('should call client.delete with correct parameters', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ success: true });
      (createClient as any).mockReturnValue({ delete: mockDelete });

      const result = await deleteResource(mockConfig, {
        resourceType: 'Patient',
        resourceId: 'test-123',
      });

      expect(mockDelete).toHaveBeenCalledWith('Patient', 'test-123');
      expect(result.success).toBe(true);
    });
  });

  describe('searchResources', () => {
    it('should search with basic query', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          resourceType: 'Bundle',
          type: 'searchset',
          total: 1,
          entry: [{ resource: { resourceType: 'Patient', id: 'test-1' } }],
        },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      const result = await searchResources(mockConfig, {
        resourceType: 'Patient',
        queryParams: { name: 'Test' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(1);
    });

    it('should include pageSize in query', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset', total: 0 },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await searchResources(mockConfig, {
        resourceType: 'Patient',
        pageSize: 50,
      });

      expect(mockGet).toHaveBeenCalledWith('Patient', undefined, expect.objectContaining({
        _count: '50',
      }));
    });

    it('should include pageToken in query', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset', total: 0 },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await searchResources(mockConfig, {
        resourceType: 'Patient',
        pageToken: 'next-page-token',
      });

      expect(mockGet).toHaveBeenCalledWith('Patient', undefined, expect.objectContaining({
        _page_token: 'next-page-token',
      }));
    });

    it('should handle search failure', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: false,
        error: 'Search failed',
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      const result = await searchResources(mockConfig, {
        resourceType: 'Patient',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });

  describe('syncPatientBundle', () => {
    it('should convert bundle to transaction bundle', async () => {
      const mockExecuteBundle = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'transaction-response' },
      });
      (createClient as any).mockReturnValue({ executeBundle: mockExecuteBundle });

      const bundle = {
        resourceType: 'Bundle' as const,
        type: 'collection' as const,
        entry: [
          { resource: { resourceType: 'Patient', id: 'patient-1' } },
          { resource: { resourceType: 'Observation', id: 'obs-1' } },
        ],
      };

      const result = await syncPatientBundle(mockConfig, bundle);

      expect(mockExecuteBundle).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getPatientEverything', () => {
    it('should call $everything operation', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset' },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await getPatientEverything(mockConfig, 'patient-123');

      expect(mockGet).toHaveBeenCalledWith('Patient', 'patient-123/$everything');
    });
  });

  describe('createPatient', () => {
    it('should create patient resource', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'new-patient' },
      });
      (createClient as any).mockReturnValue({ post: mockPost });

      const patient = {
        resourceType: 'Patient' as const,
        name: [{ family: 'Smith', given: ['John'] }],
      };

      const result = await createPatient(mockConfig, patient);

      expect(mockPost).toHaveBeenCalledWith('Patient', patient);
      expect(result.success).toBe(true);
    });
  });

  describe('getPatient', () => {
    it('should get patient by ID', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Patient', id: 'patient-123' },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      const result = await getPatient(mockConfig, 'patient-123');

      expect(mockGet).toHaveBeenCalledWith('Patient', 'patient-123', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('searchPatients', () => {
    it('should search patients with query params', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset', total: 1 },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await searchPatients(mockConfig, { name: 'Smith' });

      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('createObservation', () => {
    it('should create observation resource', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Observation', id: 'new-obs' },
      });
      (createClient as any).mockReturnValue({ post: mockPost });

      const observation = {
        resourceType: 'Observation' as const,
        status: 'final' as const,
        code: { coding: [{ code: '8310-5', display: 'Body temperature' }] },
      };

      await createObservation(mockConfig, observation);

      expect(mockPost).toHaveBeenCalledWith('Observation', observation);
    });
  });

  describe('getPatientObservations', () => {
    it('should search observations for patient', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset', total: 5 },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await getPatientObservations(mockConfig, 'patient-123');

      expect(mockGet).toHaveBeenCalled();
    });

    it('should pass additional query params', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Bundle', type: 'searchset', total: 5 },
      });
      (createClient as any).mockReturnValue({ get: mockGet });

      await getPatientObservations(mockConfig, 'patient-123', { code: '8310-5' });

      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('createEncounter', () => {
    it('should create encounter resource', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'Encounter', id: 'new-enc' },
      });
      (createClient as any).mockReturnValue({ post: mockPost });

      const encounter = {
        resourceType: 'Encounter' as const,
        status: 'in-progress' as const,
        class: { code: 'AMB', display: 'ambulatory' },
      };

      await createEncounter(mockConfig, encounter);

      expect(mockPost).toHaveBeenCalledWith('Encounter', encounter);
    });
  });

  describe('createMedicationRequest', () => {
    it('should create medication request resource', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        success: true,
        data: { resourceType: 'MedicationRequest', id: 'new-med' },
      });
      (createClient as any).mockReturnValue({ post: mockPost });

      const medicationRequest = {
        resourceType: 'MedicationRequest' as const,
        status: 'active' as const,
        intent: 'order' as const,
        medicationCodeableConcept: {
          coding: [{ code: '197884', display: 'Lisinopril 10 MG' }],
        },
      };

      await createMedicationRequest(mockConfig, medicationRequest);

      expect(mockPost).toHaveBeenCalledWith('MedicationRequest', medicationRequest);
    });
  });

  describe('batchSync', () => {
    it('should sync multiple resources', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({ success: false }),
        post: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'new-id' },
        }),
        put: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'updated-id' },
        }),
      };
      (createClient as any).mockReturnValue(mockClient);

      const resources = [
        { resourceType: 'Patient' as const, resource: { resourceType: 'Patient', id: 'p1' } },
        { resourceType: 'Observation' as const, resource: { resourceType: 'Observation', id: 'o1' } },
      ];

      const results = await batchSync(mockConfig, resources);

      expect(results.length).toBe(2);
      expect(results[0].action).toBe('created');
    });

    it('should update existing resources', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({ success: true, data: { id: 'existing' } }),
        put: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'updated-id' },
        }),
      };
      (createClient as any).mockReturnValue(mockClient);

      const resources = [
        { resourceType: 'Patient' as const, resource: { resourceType: 'Patient', id: 'existing' } },
      ];

      const results = await batchSync(mockConfig, resources);

      expect(results[0].action).toBe('updated');
    });
  });
});

console.log('Test suite completed.');
