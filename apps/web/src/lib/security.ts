/**
 * Security Utilities for Healthcare Application
 *
 * HIPAA Security Rule Compliance:
 * - § 164.312(a)(1): Access Control
 * - § 164.312(b): Audit Controls
 * - § 164.312(e)(1): Transmission Security
 *
 * Features:
 * - Bot/Crawler detection and blocking
 * - Egress controls via CSP
 * - Request anomaly detection
 * - Security headers management
 */

/**
 * Known bot and crawler user agent patterns
 * These are blocked from accessing the application
 */
const BLOCKED_BOT_PATTERNS = [
  // Search engine crawlers (should respect robots.txt, but block anyway)
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i, // Yahoo
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /ia_archiver/i, // Alexa

  // SEO and marketing tools
  /semrush/i,
  /ahrefs/i,
  /moz\.com/i,
  /majestic/i,
  /screaming frog/i,
  /dotbot/i,

  // Scraping tools
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /curl/i,
  /wget/i,
  /httpie/i,
  /postman/i,
  /insomnia/i,

  // Headless browsers (often used for scraping)
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,

  // Vulnerability scanners
  /nmap/i,
  /nikto/i,
  /sqlmap/i,
  /masscan/i,
  /zgrab/i,
  /nuclei/i,
  /wpscan/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /burpsuite/i,

  // Generic bots
  /bot/i,
  /spider/i,
  /crawler/i,
  /scraper/i,
  /archive/i,
  /http client/i,
];

/**
 * Suspicious patterns that may indicate automated access
 */
const SUSPICIOUS_PATTERNS = [
  // No user agent
  /^$/,
  // Very short user agents
  /^.{1,10}$/,
  // Java clients (often automated)
  /^java\//i,
  // Generic HTTP libraries
  /libwww/i,
  /lwp-trivial/i,
  /go-http-client/i,
  /node-fetch/i,
  /axios/i,
  /got\//i,
];

/**
 * Allowed API clients (for legitimate integrations)
 * Add patterns here for trusted services that need API access
 */
const ALLOWED_API_CLIENTS: RegExp[] = [
  // Add trusted integration patterns here
  // /trusted-service/i,
];

export interface BotDetectionResult {
  isBot: boolean;
  isSuspicious: boolean;
  isBlocked: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect if the request is from a bot or crawler
 */
export function detectBot(userAgent: string | null, path: string): BotDetectionResult {
  // No user agent is highly suspicious
  if (!userAgent || userAgent.trim() === '') {
    return {
      isBot: true,
      isSuspicious: true,
      isBlocked: true,
      reason: 'Missing user agent',
      confidence: 'high',
    };
  }

  const ua = userAgent.toLowerCase();

  // Check allowed API clients first
  for (const pattern of ALLOWED_API_CLIENTS) {
    if (pattern.test(ua)) {
      return {
        isBot: false,
        isSuspicious: false,
        isBlocked: false,
        confidence: 'high',
      };
    }
  }

  // Check blocked bot patterns
  for (const pattern of BLOCKED_BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return {
        isBot: true,
        isSuspicious: true,
        isBlocked: true,
        reason: `Matched blocked pattern: ${pattern.source}`,
        confidence: 'high',
      };
    }
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(ua)) {
      return {
        isBot: false,
        isSuspicious: true,
        isBlocked: false, // Suspicious but not blocked, will be rate limited
        reason: `Matched suspicious pattern: ${pattern.source}`,
        confidence: 'medium',
      };
    }
  }

  return {
    isBot: false,
    isSuspicious: false,
    isBlocked: false,
    confidence: 'low',
  };
}

/**
 * Request anomaly indicators
 */
export interface RequestAnomalies {
  missingHeaders: string[];
  suspiciousHeaders: string[];
  anomalyScore: number;
  shouldBlock: boolean;
}

/**
 * Detect request anomalies that may indicate automated/malicious access
 */
export function detectRequestAnomalies(headers: Headers): RequestAnomalies {
  const missingHeaders: string[] = [];
  const suspiciousHeaders: string[] = [];
  let anomalyScore = 0;

  // Check for typical browser headers
  const expectedHeaders = [
    'accept',
    'accept-language',
    'accept-encoding',
  ];

  for (const header of expectedHeaders) {
    if (!headers.get(header)) {
      missingHeaders.push(header);
      anomalyScore += 10;
    }
  }

  // Check for suspicious header values
  const acceptHeader = headers.get('accept');
  if (acceptHeader === '*/*' || acceptHeader === 'application/json') {
    // API-only accept header on non-API routes is suspicious
    suspiciousHeaders.push('accept: API-only');
    anomalyScore += 5;
  }

  // Check for missing referer on internal navigation (POST requests should have origin)
  const method = headers.get('x-http-method') || 'GET';
  if (method === 'POST' && !headers.get('origin')) {
    suspiciousHeaders.push('missing origin on POST');
    anomalyScore += 15;
  }

  // Check for automated tool indicators
  const connection = headers.get('connection');
  if (connection === 'close') {
    // Browsers typically use keep-alive
    suspiciousHeaders.push('connection: close');
    anomalyScore += 5;
  }

  return {
    missingHeaders,
    suspiciousHeaders,
    anomalyScore,
    shouldBlock: anomalyScore >= 30,
  };
}

/**
 * Content Security Policy configuration for healthcare application
 *
 * Egress Controls:
 * - Restricts where data can be sent (form-action, connect-src)
 * - Prevents XSS attacks (script-src, style-src)
 * - Blocks unauthorized iframes (frame-ancestors)
 */
export function getContentSecurityPolicy(nonce?: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  // Base URL for the application
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const directives: Record<string, string[]> = {
    // Default: only allow same origin
    'default-src': ["'self'"],

    // Scripts: self + nonce for inline (if provided)
    'script-src': [
      "'self'",
      nonce ? `'nonce-${nonce}'` : '',
      isDev ? "'unsafe-eval'" : '', // Required for React Fast Refresh in dev
      isDev ? "'unsafe-inline'" : '', // Required for dev tools
    ].filter(Boolean),

    // Styles: self + inline (needed for styled-components/tailwind)
    'style-src': ["'self'", "'unsafe-inline'"],

    // Images: self + data URIs (for inline images)
    'img-src': ["'self'", 'data:', 'blob:'],

    // Fonts: self only
    'font-src': ["'self'"],

    // EGRESS CONTROL: Where forms can submit data
    'form-action': ["'self'"],

    // EGRESS CONTROL: Where fetch/XHR can connect
    // This is critical for preventing data exfiltration
    'connect-src': [
      "'self'",
      baseUrl,
      isDev ? 'ws://localhost:*' : '', // WebSocket for HMR in dev
      isDev ? 'http://localhost:*' : '',
      // Add trusted external APIs here if needed:
      // 'https://api.trusted-service.com',
    ].filter(Boolean),

    // Frames: prevent embedding this site
    'frame-ancestors': ["'none'"],

    // Frame sources: don't allow any iframes
    'frame-src': ["'none'"],

    // Object/embed: block plugins
    'object-src': ["'none'"],

    // Base URI: prevent base tag hijacking
    'base-uri': ["'self'"],

    // Upgrade insecure requests in production
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),

    // Block all mixed content
    'block-all-mixed-content': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers for the application
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  return {
    // Content Security Policy - Primary egress control
    'Content-Security-Policy': getContentSecurityPolicy(nonce),

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // XSS Protection (legacy, but still useful)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy - Don't leak URLs
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy - Disable unnecessary features
    'Permissions-Policy': [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()', // Block FLoC
    ].join(', '),

    // HSTS - Force HTTPS (only in production)
    ...(process.env.NODE_ENV === 'production'
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload' }
      : {}),

    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',

    // Cache control for sensitive data
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

/**
 * Rate limit multipliers for suspicious requests
 */
export function getRateLimitMultiplier(botResult: BotDetectionResult, anomalies: RequestAnomalies): number {
  let multiplier = 1;

  if (botResult.isSuspicious) {
    multiplier *= 0.5; // Half the normal rate limit
  }

  if (anomalies.anomalyScore > 15) {
    multiplier *= 0.5; // Further reduce for anomalous requests
  }

  return Math.max(multiplier, 0.1); // Minimum 10% of normal rate
}

/**
 * Generate a security event log entry
 */
export interface SecurityEvent {
  type: 'BOT_BLOCKED' | 'SUSPICIOUS_REQUEST' | 'ANOMALY_DETECTED' | 'RATE_LIMITED' | 'CSP_VIOLATION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientIp: string;
  userAgent: string;
  path: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export function createSecurityEvent(
  type: SecurityEvent['type'],
  severity: SecurityEvent['severity'],
  clientIp: string,
  userAgent: string,
  path: string,
  details: Record<string, unknown> = {}
): SecurityEvent {
  return {
    type,
    severity,
    clientIp,
    userAgent,
    path,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log security event (structured logging for SIEM integration)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  console.log(JSON.stringify({
    ...event,
    _type: 'security_event',
    _application: 'xoai-healthcare',
  }));
}
