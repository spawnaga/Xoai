import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration
 *
 * HIPAA Security Consideration:
 * Healthcare applications should not be indexed by search engines.
 * This prevents exposure of:
 * - Application routes and structure
 * - Potential information leakage
 * - Unauthorized discovery of the application
 *
 * All crawlers are disallowed from accessing any part of the application.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
    // No sitemap - intentionally omitted for security
  };
}
