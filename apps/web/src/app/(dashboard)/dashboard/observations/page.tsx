import Link from 'next/link';
import { Suspense } from 'react';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';
import { ObservationList } from '@/components/observations/observation-list';

/**
 * Observations Page (Server Component)
 *
 * SSR Benefits:
 * - Patient list pre-fetched server-side
 * - PHI access logged before data is exposed
 * - Fast initial render with patient dropdown ready
 *
 * HIPAA Compliance:
 * - Server-side session validation
 * - PHI access audit logging before data fetch
 */

export const metadata = {
  title: 'Observations | Xoai Healthcare',
  description: 'Patient observations and vital signs',
};

async function getPatients() {
  try {
    const caller = await getServerCaller();
    const result = await caller.patient.list({ limit: 100 });
    return result.items.map((p: { id: string; firstName: string; lastName: string; mrn: string }) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.mrn,
    }));
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

export default async function ObservationsPage() {
  // Server-side session check
  const session = await requireSession('/dashboard/observations');

  // Log PHI access for HIPAA audit trail
  await logPHIAccess('VIEW', 'Observation', 'list', {
    section: 'observations-list',
    userId: session.user.id,
  });

  // Pre-fetch patients for the dropdown
  const patients = await getPatients();

  return (
    <div className="space-y-6">
      {/* Header (Server-rendered) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Observations</h1>
          <p className="mt-1 text-slate-500">
            View and record patient vitals and clinical observations
          </p>
        </div>
        <Link
          href="/dashboard/observations/record"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Vitals
        </Link>
      </div>

      {/* Observation List (Client Component with server-fetched patient list) */}
      <Suspense fallback={<ObservationListSkeleton />}>
        <ObservationList patients={patients} />
      </Suspense>
    </div>
  );
}

function ObservationListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Patient selection skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
        <div className="h-10 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Empty state skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-12">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
          <div className="w-32 h-5 bg-slate-200 rounded mb-2"></div>
          <div className="w-48 h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
