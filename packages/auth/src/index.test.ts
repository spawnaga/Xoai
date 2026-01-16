import { describe, it, expect } from 'vitest';
import { defaultAuthConfig, createAuthConfig } from './index';
import type { AuthConfig } from './index';

describe('Auth Package', () => {
  describe('defaultAuthConfig', () => {
    it('should have empty providers array', () => {
      expect(defaultAuthConfig.providers).toEqual([]);
    });

    it('should use JWT session strategy by default', () => {
      expect(defaultAuthConfig.session.strategy).toBe('jwt');
    });

    it('should have HIPAA-compliant 15 minute session timeout', () => {
      // HIPAA requires short session timeouts for healthcare applications
      const fifteenMinutesInSeconds = 15 * 60;
      expect(defaultAuthConfig.session.maxAge).toBe(fifteenMinutesInSeconds);
    });
  });

  describe('createAuthConfig', () => {
    it('should return config object', () => {
      const config = createAuthConfig();

      expect(config).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(config.session).toBeDefined();
    });

    it('should return default config structure', () => {
      const config = createAuthConfig();

      expect(config.session.strategy).toBe('jwt');
      expect(config.session.maxAge).toBeGreaterThan(0);
    });
  });

  describe('AuthConfig type', () => {
    it('should support OAuth provider', () => {
      const config: AuthConfig = {
        providers: [
          {
            id: 'google',
            name: 'Google',
            type: 'oauth',
          },
        ],
        session: {
          strategy: 'jwt',
          maxAge: 3600,
          updateAge: 300,
        },
      };

      expect(config.providers[0]?.type).toBe('oauth');
    });

    it('should support credentials provider', () => {
      const config: AuthConfig = {
        providers: [
          {
            id: 'credentials',
            name: 'Email/Password',
            type: 'credentials',
          },
        ],
        session: {
          strategy: 'database',
          maxAge: 7200,
          updateAge: 600,
        },
      };

      expect(config.providers[0]?.type).toBe('credentials');
      expect(config.session.strategy).toBe('database');
    });

    it('should support multiple providers', () => {
      const config: AuthConfig = {
        providers: [
          { id: 'google', name: 'Google', type: 'oauth' },
          { id: 'github', name: 'GitHub', type: 'oauth' },
          { id: 'credentials', name: 'Email', type: 'credentials' },
        ],
        session: {
          strategy: 'jwt',
          maxAge: 86400,
          updateAge: 900,
        },
      };

      expect(config.providers).toHaveLength(3);
    });
  });
});
