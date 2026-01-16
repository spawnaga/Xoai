import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectBot,
  detectRequestAnomalies,
  getContentSecurityPolicy,
  getSecurityHeaders,
  getRateLimitMultiplier,
  createSecurityEvent,
} from './security';

describe('Security Utilities', () => {
  describe('detectBot', () => {
    describe('should block known bots', () => {
      const blockedBots = [
        { name: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
        { name: 'Bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
        { name: 'curl', ua: 'curl/7.68.0' },
        { name: 'wget', ua: 'Wget/1.20.3 (linux-gnu)' },
        { name: 'Python requests', ua: 'python-requests/2.25.1' },
        { name: 'Scrapy', ua: 'Scrapy/2.5.0 (+https://scrapy.org)' },
        { name: 'Puppeteer', ua: 'Mozilla/5.0 HeadlessChrome/91.0.4472.124 Safari/537.36 Puppeteer' },
        { name: 'Selenium', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Selenium/4.0' },
        { name: 'SQLMap', ua: 'sqlmap/1.5.2#stable (http://sqlmap.org)' },
        { name: 'Nikto', ua: 'Mozilla/5.00 (Nikto/2.1.6)' },
        { name: 'Semrush', ua: 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)' },
        { name: 'Ahrefs', ua: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)' },
      ];

      for (const bot of blockedBots) {
        it(`should block ${bot.name}`, () => {
          const result = detectBot(bot.ua, '/dashboard');
          expect(result.isBlocked).toBe(true);
          expect(result.isBot).toBe(true);
          expect(result.confidence).toBe('high');
        });
      }
    });

    describe('should allow legitimate browsers', () => {
      const legitimateBrowsers = [
        { name: 'Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
        { name: 'Firefox', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
        { name: 'Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15' },
        { name: 'Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59' },
        { name: 'Mobile Chrome', ua: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36' },
        { name: 'Mobile Safari', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1' },
      ];

      for (const browser of legitimateBrowsers) {
        it(`should allow ${browser.name}`, () => {
          const result = detectBot(browser.ua, '/dashboard');
          expect(result.isBlocked).toBe(false);
          expect(result.isBot).toBe(false);
        });
      }
    });

    it('should block empty user agent', () => {
      const result = detectBot('', '/dashboard');
      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe('Missing user agent');
    });

    it('should block null user agent', () => {
      const result = detectBot(null, '/dashboard');
      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe('Missing user agent');
    });

    it('should flag suspicious but not block Java clients', () => {
      const result = detectBot('Java/1.8.0_292', '/api/data');
      expect(result.isSuspicious).toBe(true);
      // Java clients are suspicious but pattern doesn't match blocked list
    });
  });

  describe('detectRequestAnomalies', () => {
    it('should detect missing expected headers', () => {
      const headers = new Headers();
      // Missing accept, accept-language, accept-encoding

      const result = detectRequestAnomalies(headers);

      expect(result.missingHeaders).toContain('accept');
      expect(result.missingHeaders).toContain('accept-language');
      expect(result.missingHeaders).toContain('accept-encoding');
      expect(result.anomalyScore).toBeGreaterThan(0);
    });

    it('should not flag normal browser requests', () => {
      const headers = new Headers({
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.5',
        'accept-encoding': 'gzip, deflate, br',
        'connection': 'keep-alive',
      });

      const result = detectRequestAnomalies(headers);

      expect(result.missingHeaders).toHaveLength(0);
      expect(result.shouldBlock).toBe(false);
    });

    it('should calculate anomaly score correctly', () => {
      const headers = new Headers();
      // All 3 expected headers missing = 30 points

      const result = detectRequestAnomalies(headers);

      expect(result.anomalyScore).toBe(30); // 10 points per missing header
      expect(result.shouldBlock).toBe(true); // Score >= 30
    });
  });

  describe('getContentSecurityPolicy', () => {
    it('should include self directive', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("default-src 'self'");
    });

    it('should block framing (clickjacking protection)', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should restrict form submissions (egress control)', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("form-action 'self'");
    });

    it('should restrict fetch/XHR destinations (egress control)', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("connect-src 'self'");
    });

    it('should block plugins', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("object-src 'none'");
    });

    it('should include nonce when provided', () => {
      const nonce = 'test-nonce-123';
      const csp = getContentSecurityPolicy(nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
    });
  });

  describe('getSecurityHeaders', () => {
    it('should include Content-Security-Policy', () => {
      const headers = getSecurityHeaders();

      expect(headers['Content-Security-Policy']).toBeDefined();
    });

    it('should include X-Content-Type-Options', () => {
      const headers = getSecurityHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should include X-Frame-Options', () => {
      const headers = getSecurityHeaders();

      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should include X-XSS-Protection', () => {
      const headers = getSecurityHeaders();

      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should include Referrer-Policy', () => {
      const headers = getSecurityHeaders();

      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy', () => {
      const headers = getSecurityHeaders();

      expect(headers['Permissions-Policy']).toBeDefined();
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
      expect(headers['Permissions-Policy']).toContain('geolocation=()');
    });

    it('should include Cross-Origin policies', () => {
      const headers = getSecurityHeaders();

      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });

    it('should include cache control for sensitive data', () => {
      const headers = getSecurityHeaders();

      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Pragma']).toBe('no-cache');
    });
  });

  describe('getRateLimitMultiplier', () => {
    it('should return 1 for normal requests', () => {
      const botResult = { isBot: false, isSuspicious: false, isBlocked: false, confidence: 'low' as const };
      const anomalies = { missingHeaders: [], suspiciousHeaders: [], anomalyScore: 0, shouldBlock: false };

      const multiplier = getRateLimitMultiplier(botResult, anomalies);

      expect(multiplier).toBe(1);
    });

    it('should reduce rate limit for suspicious requests', () => {
      const botResult = { isBot: false, isSuspicious: true, isBlocked: false, confidence: 'medium' as const };
      const anomalies = { missingHeaders: [], suspiciousHeaders: [], anomalyScore: 0, shouldBlock: false };

      const multiplier = getRateLimitMultiplier(botResult, anomalies);

      expect(multiplier).toBe(0.5);
    });

    it('should further reduce rate limit for anomalous requests', () => {
      const botResult = { isBot: false, isSuspicious: true, isBlocked: false, confidence: 'medium' as const };
      const anomalies = { missingHeaders: ['accept'], suspiciousHeaders: [], anomalyScore: 20, shouldBlock: false };

      const multiplier = getRateLimitMultiplier(botResult, anomalies);

      expect(multiplier).toBe(0.25); // 0.5 * 0.5
    });

    it('should not go below 10%', () => {
      const botResult = { isBot: false, isSuspicious: true, isBlocked: false, confidence: 'high' as const };
      const anomalies = { missingHeaders: ['accept', 'accept-language'], suspiciousHeaders: ['connection'], anomalyScore: 50, shouldBlock: false };

      const multiplier = getRateLimitMultiplier(botResult, anomalies);

      expect(multiplier).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('createSecurityEvent', () => {
    it('should create properly structured event', () => {
      const event = createSecurityEvent(
        'BOT_BLOCKED',
        'high',
        '192.168.1.1',
        'Googlebot/2.1',
        '/dashboard',
        { reason: 'Known bot' }
      );

      expect(event.type).toBe('BOT_BLOCKED');
      expect(event.severity).toBe('high');
      expect(event.clientIp).toBe('192.168.1.1');
      expect(event.userAgent).toBe('Googlebot/2.1');
      expect(event.path).toBe('/dashboard');
      expect(event.details.reason).toBe('Known bot');
      expect(event.timestamp).toBeDefined();
    });

    it('should include timestamp in ISO format', () => {
      const event = createSecurityEvent(
        'ANOMALY_DETECTED',
        'medium',
        '10.0.0.1',
        'unknown',
        '/api/data',
        {}
      );

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should prevent data exfiltration via CSP connect-src', () => {
      const csp = getContentSecurityPolicy();

      // Should only allow connections to self
      expect(csp).toContain("connect-src 'self'");
      // Should not allow arbitrary domains
      expect(csp).not.toContain('connect-src *');
    });

    it('should prevent form hijacking via CSP form-action', () => {
      const csp = getContentSecurityPolicy();

      expect(csp).toContain("form-action 'self'");
    });

    it('should prevent clickjacking', () => {
      const headers = getSecurityHeaders();

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(getContentSecurityPolicy()).toContain("frame-ancestors 'none'");
    });

    it('should disable unnecessary browser features', () => {
      const headers = getSecurityHeaders();
      const permissions = headers['Permissions-Policy'];

      // Features that could leak PHI
      expect(permissions).toContain('camera=()');
      expect(permissions).toContain('microphone=()');
      expect(permissions).toContain('geolocation=()');
    });

    it('should prevent caching of sensitive data', () => {
      const headers = getSecurityHeaders();

      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Cache-Control']).toContain('no-cache');
    });
  });
});
