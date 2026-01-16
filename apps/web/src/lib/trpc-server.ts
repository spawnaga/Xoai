import 'server-only';

import { cache } from 'react';
import { appRouter, type Context } from '@xoai/api';
import { getSession } from './auth';
import { db } from '@xoai/db';

/**
 * Server-Side tRPC Caller
 *
 * This module provides a server-side tRPC caller for use in:
 * - Server Components (RSC)
 * - Server Actions
 * - Route Handlers
 *
 * Benefits:
 * - Data fetching happens on the server (SSR)
 * - No client-side waterfall requests
 * - Direct database access (no HTTP overhead)
 * - Proper session context for auth
 *
 * HIPAA Compliance:
 * - PHI never exposed to client until rendered
 * - Server-side access control
 * - Audit logging through context
 */

/**
 * Create tRPC context with current session
 * Cached per request to avoid duplicate session lookups
 */
export const createServerContext = cache(async (): Promise<Context> => {
  const session = await getSession();

  // Convert AuthSession to API Context Session format
  const contextSession = session
    ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || undefined,
          role: session.user.role,
        },
        expires: new Date(session.expires),
      }
    : null;

  return {
    db,
    session: contextSession,
  };
});

/**
 * Get a server-side tRPC caller with context
 *
 * Usage in Server Components:
 * ```tsx
 * import { getServerCaller } from '@/lib/trpc-server';
 *
 * export default async function PatientsPage() {
 *   const caller = await getServerCaller();
 *   const patients = await caller.patient.list();
 *   return <PatientList patients={patients} />;
 * }
 * ```
 */
export const getServerCaller = cache(async () => {
  const ctx = await createServerContext();
  return appRouter.createCaller(ctx);
});

/**
 * Type-safe server caller type
 */
export type ServerCaller = Awaited<ReturnType<typeof getServerCaller>>;
