import * as jwt from 'jsonwebtoken';
import type { GoogleHealthcareConfig, GoogleHealthcareCredentials } from './types';

const TOKEN_AUDIENCE = 'https://healthcare.googleapis.com/';
const TOKEN_EXPIRY = 3600; // 1 hour in seconds

interface TokenCache {
  token: string;
  expiresAt: Date;
}

let tokenCache: TokenCache | null = null;

/**
 * Generate a signed JWT for Google Healthcare API authentication
 */
export function generateServiceAccountToken(config: GoogleHealthcareConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccountEmail = config.serviceAccountEmail;

  const payload = {
    iss: serviceAccountEmail,
    sub: serviceAccountEmail,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  const token = jwt.sign(payload, config.privateKey, {
    algorithm: 'RS256',
    header: {
      alg: 'RS256',
      typ: 'JWT',
      kid: config.privateKeyId,
    },
  });

  return token;
}

/**
 * Get a valid access token, using cache if available
 */
export function getAccessToken(config: GoogleHealthcareConfig): string {
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer before expiry

  // Return cached token if still valid
  if (tokenCache && tokenCache.expiresAt.getTime() - bufferMs > now.getTime()) {
    return tokenCache.token;
  }

  // Generate new token
  const token = generateServiceAccountToken(config);
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY * 1000);

  // Update cache
  tokenCache = { token, expiresAt };

  return token;
}

/**
 * Create credentials object with access token
 */
export function getCredentials(config: GoogleHealthcareConfig): GoogleHealthcareCredentials {
  const token = getAccessToken(config);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY * 1000);

  return {
    projectId: config.projectId,
    location: config.location,
    datasetId: config.datasetId,
    fhirStoreId: config.fhirStoreId,
    accessToken: token,
    expiresAt,
  };
}

/**
 * Clear the token cache (useful for testing or token refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Validate configuration has all required fields
 */
export function validateConfig(config: Partial<GoogleHealthcareConfig>): config is GoogleHealthcareConfig {
  const requiredFields: (keyof GoogleHealthcareConfig)[] = [
    'projectId',
    'location',
    'datasetId',
    'fhirStoreId',
    'serviceAccountEmail',
    'privateKeyId',
    'privateKey',
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      return false;
    }
  }

  return true;
}

/**
 * Create config from environment variables
 */
export function getConfigFromEnv(): GoogleHealthcareConfig {
  const config: GoogleHealthcareConfig = {
    projectId: process.env.GOOGLE_PROJECT_ID || '',
    location: process.env.GOOGLE_LOCATION || '',
    datasetId: process.env.GOOGLE_DATASET_ID || '',
    fhirStoreId: process.env.GOOGLE_FHIR_STORE_ID || '',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKeyId: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (!validateConfig(config)) {
    throw new Error(
      'Missing required Google Healthcare configuration. ' +
      'Please set all GOOGLE_* environment variables.'
    );
  }

  return config;
}
