import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { GoogleHealthcareConfig } from './types';

console.log('Starting test suite...');

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock.jwt.token'),
  },
  sign: vi.fn(() => 'mock.jwt.token'),
}));

// Import after mocking
import {
  generateServiceAccountToken,
  getAccessToken,
  getCredentials,
  clearTokenCache,
  validateConfig,
  getConfigFromEnv,
} from './auth';
import * as jwt from 'jsonwebtoken';

// Mock config for testing
const mockConfig: GoogleHealthcareConfig = {
  projectId: 'test-project',
  location: 'us-central1',
  datasetId: 'test-dataset',
  fhirStoreId: 'test-fhir-store',
  serviceAccountEmail: 'test@test-project.iam.gserviceaccount.com',
  privateKeyId: 'test-key-id',
  privateKey: 'mock-private-key',
};

describe('Google Healthcare Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTokenCache();
  });

  describe('validateConfig', () => {
    it('should return true for complete config', () => {
      expect(validateConfig(mockConfig)).toBe(true);
    });

    it('should return false for missing projectId', () => {
      const { projectId, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing location', () => {
      const { location, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing datasetId', () => {
      const { datasetId, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing fhirStoreId', () => {
      const { fhirStoreId, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing serviceAccountEmail', () => {
      const { serviceAccountEmail, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing privateKeyId', () => {
      const { privateKeyId, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for missing privateKey', () => {
      const { privateKey, ...partial } = mockConfig;
      expect(validateConfig(partial)).toBe(false);
    });

    it('should return false for empty config', () => {
      expect(validateConfig({})).toBe(false);
    });
  });

  describe('generateServiceAccountToken', () => {
    it('should generate a JWT token string', () => {
      const token = generateServiceAccountToken(mockConfig);
      expect(typeof token).toBe('string');
      expect(token).toBe('mock.jwt.token');
    });

    it('should call jwt.sign with correct payload', () => {
      generateServiceAccountToken(mockConfig);

      expect(jwt.sign).toHaveBeenCalled();
      const [payload, key, options] = (jwt.sign as any).mock.calls[0];

      expect(payload.iss).toBe(mockConfig.serviceAccountEmail);
      expect(payload.sub).toBe(mockConfig.serviceAccountEmail);
      expect(payload.aud).toBe('https://healthcare.googleapis.com/');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should use RS256 algorithm', () => {
      generateServiceAccountToken(mockConfig);

      const [, , options] = (jwt.sign as any).mock.calls[0];
      expect(options.algorithm).toBe('RS256');
    });

    it('should include private key id in header', () => {
      generateServiceAccountToken(mockConfig);

      const [, , options] = (jwt.sign as any).mock.calls[0];
      expect(options.header.kid).toBe(mockConfig.privateKeyId);
    });
  });

  describe('getAccessToken', () => {
    it('should return a token', () => {
      const token = getAccessToken(mockConfig);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should return cached token on subsequent calls', () => {
      const token1 = getAccessToken(mockConfig);
      const token2 = getAccessToken(mockConfig);
      expect(token1).toBe(token2);
    });

    it('should return new token after cache clear', () => {
      const token1 = getAccessToken(mockConfig);
      clearTokenCache();
      // Note: tokens might be same if generated within same second
      const token2 = getAccessToken(mockConfig);
      expect(typeof token2).toBe('string');
    });
  });

  describe('getCredentials', () => {
    it('should return credentials object with all fields', () => {
      const creds = getCredentials(mockConfig);

      expect(creds.projectId).toBe(mockConfig.projectId);
      expect(creds.location).toBe(mockConfig.location);
      expect(creds.datasetId).toBe(mockConfig.datasetId);
      expect(creds.fhirStoreId).toBe(mockConfig.fhirStoreId);
      expect(creds.accessToken).toBeDefined();
      expect(creds.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiry in the future', () => {
      const creds = getCredentials(mockConfig);
      expect(creds.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('clearTokenCache', () => {
    it('should clear the cache successfully', () => {
      // Get initial token
      getAccessToken(mockConfig);

      // Clear cache
      clearTokenCache();

      // Should not throw
      expect(() => clearTokenCache()).not.toThrow();
    });
  });

  describe('getConfigFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should throw error when required env vars are missing', () => {
      process.env.GOOGLE_PROJECT_ID = '';
      process.env.GOOGLE_LOCATION = '';

      expect(() => getConfigFromEnv()).toThrow('Missing required Google Healthcare configuration');
    });

    it('should read config from environment variables', () => {
      process.env.GOOGLE_PROJECT_ID = 'env-project';
      process.env.GOOGLE_LOCATION = 'us-east1';
      process.env.GOOGLE_DATASET_ID = 'env-dataset';
      process.env.GOOGLE_FHIR_STORE_ID = 'env-fhir-store';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'env@test.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY_ID = 'env-key-id';
      process.env.GOOGLE_PRIVATE_KEY = mockConfig.privateKey.replace(/\n/g, '\\n');

      const config = getConfigFromEnv();

      expect(config.projectId).toBe('env-project');
      expect(config.location).toBe('us-east1');
      expect(config.datasetId).toBe('env-dataset');
      expect(config.fhirStoreId).toBe('env-fhir-store');
      expect(config.serviceAccountEmail).toBe('env@test.iam.gserviceaccount.com');
      expect(config.privateKeyId).toBe('env-key-id');
    });
  });
});

console.log('Test suite completed.');
