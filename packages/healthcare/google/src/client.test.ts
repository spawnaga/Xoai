import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildBaseUrl,
  buildResourceUrl,
  buildAuthHeaders,
  parseErrorResponse,
  GoogleHealthcareClient,
  createClient,
} from './client';
import type { GoogleHealthcareConfig } from './types';

// Mock the auth module
vi.mock('./auth', () => ({
  getAccessToken: vi.fn(() => 'mock-access-token'),
}));

describe('Google Healthcare Client', () => {
  const mockConfig: GoogleHealthcareConfig = {
    projectId: 'test-project',
    location: 'us-central1',
    datasetId: 'test-dataset',
    fhirStoreId: 'test-fhir-store',
    serviceAccountEmail: 'test@test-project.iam.gserviceaccount.com',
    privateKeyId: 'key-123',
    privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
  };

  describe('buildBaseUrl', () => {
    it('should build correct base URL', () => {
      const url = buildBaseUrl(mockConfig);
      expect(url).toBe(
        'https://healthcare.googleapis.com/v1/projects/test-project/locations/us-central1/datasets/test-dataset/fhirStores/test-fhir-store/fhir'
      );
    });
  });

  describe('buildResourceUrl', () => {
    it('should build URL for resource type only', () => {
      const url = buildResourceUrl(mockConfig, 'Patient');
      expect(url).toContain('/fhir/Patient');
      expect(url).not.toContain('undefined');
    });

    it('should build URL with resource ID', () => {
      const url = buildResourceUrl(mockConfig, 'Patient', '123');
      expect(url).toContain('/fhir/Patient/123');
    });
  });

  describe('buildAuthHeaders', () => {
    it('should include authorization header', () => {
      const headers = buildAuthHeaders(mockConfig);
      expect(headers['Authorization']).toBe('Bearer mock-access-token');
    });

    it('should include FHIR content type', () => {
      const headers = buildAuthHeaders(mockConfig);
      expect(headers['Content-Type']).toBe('application/fhir+json');
      expect(headers['Accept']).toBe('application/fhir+json');
    });
  });

  describe('parseErrorResponse', () => {
    it('should parse Google API error format', () => {
      const response = { status: 404, statusText: 'Not Found' } as Response;
      const body = JSON.stringify({
        error: {
          code: 404,
          message: 'Resource not found',
          status: 'NOT_FOUND',
        },
      });

      const error = parseErrorResponse(response, body);
      expect(error.code).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe('NOT_FOUND');
    });

    it('should handle non-JSON error body', () => {
      const response = { status: 500, statusText: 'Internal Server Error' } as Response;
      const body = 'Internal server error occurred';

      const error = parseErrorResponse(response, body);
      expect(error.code).toBe(500);
      expect(error.message).toBe('Internal server error occurred');
      expect(error.status).toBe('Internal Server Error');
    });
  });

  describe('createClient', () => {
    it('should create a client instance', () => {
      const client = createClient(mockConfig);
      expect(client).toBeInstanceOf(GoogleHealthcareClient);
    });
  });

  describe('GoogleHealthcareClient', () => {
    let client: GoogleHealthcareClient;

    beforeEach(() => {
      client = createClient(mockConfig);
      global.fetch = vi.fn();
    });

    it('should make GET request', async () => {
      const mockResponse = { resourceType: 'Patient', id: '123' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.get('Patient', '123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/Patient/123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle GET with query params', async () => {
      const mockResponse = { resourceType: 'Bundle', entry: [] };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      await client.get('Patient', undefined, { name: 'John' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?name=John'),
        expect.anything()
      );
    });

    it('should make POST request', async () => {
      const mockResource = { resourceType: 'Patient', name: [{ family: 'Doe' }] };
      const mockResponse = { ...mockResource, id: '456' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.post('Patient', mockResource);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('456');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/Patient'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockResource),
        })
      );
    });

    it('should make PUT request', async () => {
      const mockResource = { resourceType: 'Patient', id: '123', name: [{ family: 'Smith' }] };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResource)),
      });

      const result = await client.put('Patient', '123', mockResource);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/Patient/123'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make DELETE request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      const result = await client.delete('Patient', '123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/Patient/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: { code: 404, message: 'Patient not found', status: 'NOT_FOUND' },
            })
          ),
      });

      const result = await client.get('Patient', '999');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(404);
      expect(result.error?.message).toBe('Patient not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.get('Patient', '123');

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Network timeout');
    });
  });
});
