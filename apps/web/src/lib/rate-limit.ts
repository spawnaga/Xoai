/**
 * Rate Limiting Utility
 *
 * HIPAA Compliance:
 * - § 164.312(d): Prevent brute force attacks on authentication
 * - Protection against automated attacks
 *
 * Features:
 * - In-memory rate limiting (production should use Redis)
 * - Configurable windows and limits per endpoint
 * - IP-based and user-based limiting
 * - Progressive delays for repeated violations
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const cutoff = now - 60 * 60 * 1000; // Remove entries older than 1 hour

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.firstRequest < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Block duration in milliseconds after limit exceeded */
  blockDurationMs?: number;
  /** Enable progressive delays (increases block time on repeated violations) */
  progressiveDelay?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupOldEntries();

  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // Check if currently blocked
  if (entry?.blocked && entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        resetAt: entry.blockedUntil,
        blocked: true,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }
    // Block expired, reset
    rateLimitStore.delete(key);
  }

  // Check if within window
  if (entry && now - entry.firstRequest < config.windowMs) {
    const newCount = entry.count + 1;

    if (newCount > config.limit) {
      // Calculate block duration (progressive if enabled)
      const baseBlockDuration = config.blockDurationMs || config.windowMs;
      const blockMultiplier = config.progressiveDelay ? Math.min(entry.count - config.limit + 1, 10) : 1;
      const blockDuration = baseBlockDuration * blockMultiplier;
      const blockedUntil = now + blockDuration;

      rateLimitStore.set(key, {
        ...entry,
        count: newCount,
        blocked: true,
        blockedUntil,
      });

      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        resetAt: blockedUntil,
        blocked: true,
        retryAfter: Math.ceil(blockDuration / 1000),
      };
    }

    // Update count
    rateLimitStore.set(key, { ...entry, count: newCount });

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - newCount,
      resetAt: entry.firstRequest + config.windowMs,
      blocked: false,
    };
  }

  // New window
  rateLimitStore.set(key, {
    count: 1,
    firstRequest: now,
    blocked: false,
  });

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - 1,
    resetAt: now + config.windowMs,
    blocked: false,
  };
}

/**
 * Pre-configured rate limiters for common endpoints
 */
export const rateLimiters = {
  /**
   * Login endpoint - Strict to prevent brute force
   * 5 attempts per 15 minutes
   */
  login: (identifier: string) =>
    checkRateLimit(`login:${identifier}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
      progressiveDelay: true,
    }),

  /**
   * Registration endpoint - Prevent spam accounts
   * 3 registrations per hour per IP
   */
  register: (identifier: string) =>
    checkRateLimit(`register:${identifier}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      progressiveDelay: false,
    }),

  /**
   * Password reset - Prevent abuse
   * 3 requests per hour
   */
  passwordReset: (identifier: string) =>
    checkRateLimit(`password-reset:${identifier}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      progressiveDelay: false,
    }),

  /**
   * API endpoints - General rate limiting
   * 100 requests per minute
   */
  api: (identifier: string) =>
    checkRateLimit(`api:${identifier}`, {
      limit: 100,
      windowMs: 60 * 1000,
      blockDurationMs: 60 * 1000,
      progressiveDelay: false,
    }),

  /**
   * PHI export - Strict to prevent data exfiltration
   * 10 exports per hour
   */
  phiExport: (identifier: string) =>
    checkRateLimit(`phi-export:${identifier}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      progressiveDelay: true,
    }),
};

/**
 * Get client identifier from request headers
 */
export function getClientIdentifier(headers: Headers): string {
  // Try to get real IP from various headers
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfIp = headers.get('cf-connecting-ip');

  if (cfIp) return cfIp;
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    return firstIp?.trim() || 'unknown';
  }
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Clear the rate limit store (for testing only)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Create a rate limiter function with custom config
 * Useful for testing or custom endpoints
 */
export function createRateLimiter(config: {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
  maxBlockDurationMs?: number;
}) {
  return (identifier: string) => {
    return checkRateLimit(identifier, {
      limit: config.maxRequests,
      windowMs: config.windowMs,
      blockDurationMs: config.blockDurationMs,
      progressiveDelay: !!config.maxBlockDurationMs,
    });
  };
}
