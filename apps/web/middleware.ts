import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  detectBot,
  detectRequestAnomalies,
  getSecurityHeaders,
  createSecurityEvent,
  logSecurityEvent,
  getRateLimitMultiplier,
} from '@/lib/security';

/**
 * HIPAA-Compliant Security Middleware
 *
 * Security features:
 * - Bot/Crawler detection and blocking
 * - Egress controls via Content Security Policy
 * - Request anomaly detection
 * - Server-side route protection
 * - Session validation before page render
 * - Comprehensive security headers
 * - Audit logging for security events
 *
 * Compliance: HIPAA Security Rule
 * - § 164.312(a)(1): Access Control
 * - § 164.312(b): Audit Controls
 * - § 164.312(d): Person or Entity Authentication
 * - § 164.312(e)(1): Transmission Security
 */

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/api/trpc',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/login',
  '/register',
];

// Public routes that don't require any authentication
const publicRoutes = [
  '/',
  '/api/auth',
  '/api/health',
  '/api/csp-report', // CSP violation reporting endpoint
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/offline',
  '/robots.txt',
];

// Paths that should skip bot detection (e.g., health checks)
const skipBotDetectionPaths = [
  '/api/health',
  '/robots.txt',
];

/**
 * Check if the path matches any of the given prefixes
 */
function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`) || pathname.startsWith(path)
  );
}

/**
 * Generate a request ID for audit logging
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check various headers in order of reliability
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    return firstIp?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Generate CSP nonce for inline scripts
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';
  const nonce = generateNonce();

  // Get security headers
  const securityHeaders = getSecurityHeaders(nonce);

  /**
   * Create response with security headers
   */
  const createResponse = (response: NextResponse) => {
    // Add all security headers
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    // Add audit tracking headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Timestamp', new Date().toISOString());
    response.headers.set('X-Nonce', nonce);

    return response;
  };

  /**
   * Create blocked response
   */
  const createBlockedResponse = (status: number, message: string) => {
    const response = new NextResponse(
      JSON.stringify({ error: message, requestId }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return createResponse(response);
  };

  // ============================================
  // SECURITY CHECK 1: Bot/Crawler Detection
  // ============================================
  if (!matchesPath(pathname, skipBotDetectionPaths)) {
    const botResult = detectBot(userAgent, pathname);

    if (botResult.isBlocked) {
      // Log security event
      logSecurityEvent(createSecurityEvent(
        'BOT_BLOCKED',
        'high',
        clientIp,
        userAgent,
        pathname,
        {
          reason: botResult.reason,
          confidence: botResult.confidence,
          requestId,
        }
      ));

      // Return 403 Forbidden for bots
      return createBlockedResponse(403, 'Access denied');
    }

    if (botResult.isSuspicious) {
      // Log suspicious activity but don't block
      logSecurityEvent(createSecurityEvent(
        'SUSPICIOUS_REQUEST',
        'medium',
        clientIp,
        userAgent,
        pathname,
        {
          reason: botResult.reason,
          confidence: botResult.confidence,
          requestId,
        }
      ));
    }
  }

  // ============================================
  // SECURITY CHECK 2: Request Anomaly Detection
  // ============================================
  const anomalies = detectRequestAnomalies(request.headers);

  if (anomalies.shouldBlock) {
    logSecurityEvent(createSecurityEvent(
      'ANOMALY_DETECTED',
      'high',
      clientIp,
      userAgent,
      pathname,
      {
        missingHeaders: anomalies.missingHeaders,
        suspiciousHeaders: anomalies.suspiciousHeaders,
        anomalyScore: anomalies.anomalyScore,
        requestId,
      }
    ));

    return createBlockedResponse(400, 'Invalid request');
  }

  // ============================================
  // PUBLIC ROUTES: Skip auth checks
  // ============================================
  if (matchesPath(pathname, publicRoutes)) {
    return createResponse(NextResponse.next());
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Protected routes require authentication
  if (matchesPath(pathname, protectedRoutes)) {
    if (!token) {
      // Log unauthorized access attempt
      logSecurityEvent(createSecurityEvent(
        'SUSPICIOUS_REQUEST',
        'medium',
        clientIp,
        userAgent,
        pathname,
        {
          event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          requestId,
        }
      ));

      // Redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);

      const response = NextResponse.redirect(loginUrl);
      response.headers.set('X-Auth-Required', 'true');
      return createResponse(response);
    }

    // Validate session has required fields
    if (!token.id || !token.email) {
      logSecurityEvent(createSecurityEvent(
        'SUSPICIOUS_REQUEST',
        'high',
        clientIp,
        userAgent,
        pathname,
        {
          event: 'INVALID_SESSION',
          tokenKeys: Object.keys(token),
          requestId,
        }
      ));

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'SessionInvalid');
      return createResponse(NextResponse.redirect(loginUrl));
    }

    // Create authenticated response with user context
    const response = NextResponse.next();

    // Add user context headers for downstream processing
    response.headers.set('X-User-ID', token.id as string);
    response.headers.set('X-User-Role', (token.role as string) || 'USER');
    response.headers.set('X-Session-Valid', 'true');

    // Log API access for audit trail
    if (pathname.startsWith('/api/')) {
      console.log(JSON.stringify({
        _type: 'api_access',
        event: 'API_ACCESS',
        requestId,
        pathname,
        userId: token.id,
        userRole: token.role,
        clientIp,
        timestamp: new Date().toISOString(),
      }));
    }

    return createResponse(response);
  }

  // Redirect authenticated users away from auth pages
  if (matchesPath(pathname, authRoutes)) {
    if (token) {
      return createResponse(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
  }

  return createResponse(NextResponse.next());
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Static assets
     */
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
