import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRateLimiter,
  rateLimiters,
  getClientIdentifier,
  createRateLimitHeaders,
  clearRateLimitStore,
} from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRateLimitStore(); // Clear store before each test
  });

  afterEach(() => {
    vi.useRealTimers();
    clearRateLimitStore(); // Cleanup after each test
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = limiter('test-client');
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests over limit', () => {
      const limiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      // First 3 requests succeed
      for (let i = 0; i < 3; i++) {
        const result = limiter('test-client');
        expect(result.success).toBe(true);
      }

      // 4th request should fail
      const result = limiter('test-client');
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      // Use up all requests
      limiter('test-client');
      limiter('test-client');

      const blocked = limiter('test-client');
      expect(blocked.success).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      const allowed = limiter('test-client');
      expect(allowed.success).toBe(true);
    });

    it('should track clients independently', () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      // Client 1 uses up quota
      limiter('client-1');
      limiter('client-1');
      const blocked1 = limiter('client-1');
      expect(blocked1.success).toBe(false);

      // Client 2 should still be allowed
      const allowed2 = limiter('client-2');
      expect(allowed2.success).toBe(true);
    });

    it('should implement progressive delays', () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 5000,
        maxBlockDurationMs: 30000,
      });

      // Use up quota
      limiter('test-client');
      limiter('test-client');

      // First block
      const firstBlock = limiter('test-client');
      expect(firstBlock.success).toBe(false);
      expect(firstBlock.blocked).toBe(true);

      // Advance past block duration
      vi.advanceTimersByTime(5001);

      // Should still be blocked (window hasn't reset)
      const stillBlocked = limiter('test-client');
      expect(stillBlocked.success).toBe(false);
    });
  });

  describe('rateLimiters', () => {
    it('should have login limiter configured', () => {
      const result = rateLimiters.login('test-ip');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(5); // 5 per 15 minutes
    });

    it('should have register limiter configured', () => {
      const result = rateLimiters.register('test-ip');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(3); // 3 per hour
    });

    it('should have api limiter configured', () => {
      const result = rateLimiters.api('test-ip');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(100); // 100 per minute
    });

    it('should have phiExport limiter configured', () => {
      const result = rateLimiters.phiExport('test-ip');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10); // 10 per hour
    });

    it('should have passwordReset limiter configured', () => {
      const result = rateLimiters.passwordReset('test-ip');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(3); // 3 per hour
    });
  });

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

      const ip = getClientIdentifier(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '172.16.0.1');

      const ip = getClientIdentifier(headers);
      expect(ip).toBe('172.16.0.1');
    });

    it('should prefer cf-connecting-ip over other headers', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '1.2.3.4');
      headers.set('x-forwarded-for', '5.6.7.8');
      headers.set('x-real-ip', '9.10.11.12');

      const ip = getClientIdentifier(headers);
      expect(ip).toBe('1.2.3.4');
    });

    it('should return "unknown" when no IP headers present', () => {
      const headers = new Headers();

      const ip = getClientIdentifier(headers);
      expect(ip).toBe('unknown');
    });

    it('should handle empty forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '');

      const ip = getClientIdentifier(headers);
      expect(ip).toBe('unknown');
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create correct headers for successful request', () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 95,
        resetAt: Date.now() + 60000,
        blocked: false,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should add Retry-After header for blocked request', () => {
      const result = {
        success: false,
        limit: 100,
        remaining: 0,
        resetAt: Date.now() + 60000,
        retryAfter: 30,
        blocked: true,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('30');
    });

    it('should not include Retry-After for successful request', () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 50,
        resetAt: Date.now() + 60000,
        blocked: false,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['Retry-After']).toBeUndefined();
    });
  });

  describe('HIPAA compliance scenarios', () => {
    it('should block login attempts after threshold (brute force protection)', () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        blockDurationMs: 15 * 60 * 1000,
      });

      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        limiter('attacker-ip');
      }

      // 6th attempt should be blocked
      const result = limiter('attacker-ip');
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should strictly limit PHI export operations', () => {
      // Use 10 exports
      for (let i = 0; i < 10; i++) {
        const result = rateLimiters.phiExport('test-user');
        expect(result.success).toBe(true);
      }

      // 11th should be blocked
      const blocked = rateLimiters.phiExport('test-user');
      expect(blocked.success).toBe(false);
    });

    it('should prevent registration spam', () => {
      // Use 3 registrations
      for (let i = 0; i < 3; i++) {
        const result = rateLimiters.register('test-ip');
        expect(result.success).toBe(true);
      }

      // 4th should be blocked
      const blocked = rateLimiters.register('test-ip');
      expect(blocked.success).toBe(false);
    });
  });
});
