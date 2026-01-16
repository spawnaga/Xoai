import type {
  GoogleHealthcareConfig,
  GoogleHealthcareResponse,
  GoogleHealthcareError,
  Resource,
} from './types';
import { getAccessToken } from './auth';

/**
 * Build the base URL for Google Healthcare API FHIR store
 */
export function buildBaseUrl(config: GoogleHealthcareConfig): string {
  return `https://healthcare.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/datasets/${config.datasetId}/fhirStores/${config.fhirStoreId}/fhir`;
}

/**
 * Build URL for a specific resource type and optional ID
 */
export function buildResourceUrl(
  config: GoogleHealthcareConfig,
  resourceType: string,
  resourceId?: string
): string {
  const baseUrl = buildBaseUrl(config);
  return resourceId ? `${baseUrl}/${resourceType}/${resourceId}` : `${baseUrl}/${resourceType}`;
}

/**
 * Build authorization headers for API requests
 */
export function buildAuthHeaders(config: GoogleHealthcareConfig): Record<string, string> {
  const token = getAccessToken(config);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json',
  };
}

/**
 * Parse error response from Google Healthcare API
 */
export function parseErrorResponse(response: Response, body: string): GoogleHealthcareError {
  try {
    const parsed = JSON.parse(body);
    if (parsed.error) {
      return {
        code: parsed.error.code || response.status,
        message: parsed.error.message || 'Unknown error',
        status: parsed.error.status || response.statusText,
        details: parsed.error.details,
      };
    }
  } catch {
    // JSON parsing failed, use raw body
  }

  return {
    code: response.status,
    message: body || response.statusText,
    status: response.statusText,
  };
}

/**
 * HTTP client wrapper for Google Healthcare API
 */
export class GoogleHealthcareClient {
  private config: GoogleHealthcareConfig;

  constructor(config: GoogleHealthcareConfig) {
    this.config = config;
  }

  /**
   * Make a GET request
   */
  async get<T = Resource>(
    resourceType: string,
    resourceId?: string,
    queryParams?: Record<string, string>
  ): Promise<GoogleHealthcareResponse<T>> {
    let url = buildResourceUrl(this.config, resourceType, resourceId);

    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildAuthHeaders(this.config),
      });

      const body = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: parseErrorResponse(response, body),
        };
      }

      return {
        success: true,
        data: JSON.parse(body) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'Network error',
          status: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Make a POST request (create resource)
   */
  async post<T = Resource>(
    resourceType: string,
    resource: Resource
  ): Promise<GoogleHealthcareResponse<T>> {
    const url = buildResourceUrl(this.config, resourceType);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildAuthHeaders(this.config),
        body: JSON.stringify(resource),
      });

      const body = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: parseErrorResponse(response, body),
        };
      }

      return {
        success: true,
        data: JSON.parse(body) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'Network error',
          status: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Make a PUT request (update resource)
   */
  async put<T = Resource>(
    resourceType: string,
    resourceId: string,
    resource: Resource
  ): Promise<GoogleHealthcareResponse<T>> {
    const url = buildResourceUrl(this.config, resourceType, resourceId);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: buildAuthHeaders(this.config),
        body: JSON.stringify(resource),
      });

      const body = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: parseErrorResponse(response, body),
        };
      }

      return {
        success: true,
        data: JSON.parse(body) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'Network error',
          status: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(resourceType: string, resourceId: string): Promise<GoogleHealthcareResponse<void>> {
    const url = buildResourceUrl(this.config, resourceType, resourceId);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: buildAuthHeaders(this.config),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          success: false,
          error: parseErrorResponse(response, body),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'Network error',
          status: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Execute a FHIR Bundle transaction
   */
  async executeBundle<T = Resource>(bundle: Resource): Promise<GoogleHealthcareResponse<T>> {
    const url = buildBaseUrl(this.config);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildAuthHeaders(this.config),
        body: JSON.stringify(bundle),
      });

      const body = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: parseErrorResponse(response, body),
        };
      }

      return {
        success: true,
        data: JSON.parse(body) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'Network error',
          status: 'NETWORK_ERROR',
        },
      };
    }
  }
}

/**
 * Create a configured client instance
 */
export function createClient(config: GoogleHealthcareConfig): GoogleHealthcareClient {
  return new GoogleHealthcareClient(config);
}
