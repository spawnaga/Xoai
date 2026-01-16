import Link from 'next/link';
import { Suspense } from 'react';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';
import { EncounterList } from '@/components/encounters/encounter-list';

/**
 * Encounters Page (Server Component)
 *
 * SSR Benefits:
 * - Encounter list fetched server-side before render
 * - PHI access logged before data is exposed
 * - Stats calculated server-side
 *
 * HIPAA Compliance:
 * - Server-side session validation
 * - PHI access audit logging before data fetch
 */

export const metadata = {
  title: 'Encounters | Xoai Healthcare',
  description: 'Patient encounter management dashboard',
};

async function getTodayEncounters() {
  try {
    const caller = await getServerCaller();
    const encounters = await caller.encounter.today();
    return encounters;
  } catch (error) {
    console.error('Error fetching encounters:', error);
    return [];
  }
}

async function getEncounterStats() {
  try {
    const caller = await getServerCaller();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await caller.encounter.stats({
      startDate: thirtyDaysAgo,
      endDate: new Date(),
    });
    return stats;
  } catch (error) {
    console.error('Error fetching encounter stats:', error);
    return null;
  }
}

export default async function EncountersPage() {
  // Server-side session check
  const session = await requireSession('/dashboard/encounters');

  // Log PHI access for HIPAA audit trail
  await logPHIAccess('VIEW', 'Encounter', 'list', {
    section: 'encounters-list',
    userId: session.user.id,
  });

  // Fetch data server-side in parallel
  const [encounters, stats] = await Promise.all([
    getTodayEncounters(),
    getEncounterStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header (Server-rendered) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Encounters</h1>
          <p className="mt-1 text-slate-500">
            Manage patient visits and appointments
          </p>
        </div>
        <Link
          href="/dashboard/encounters/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Encounter
        </Link>
      </div>

      {/* Encounter List (Client Component with server-fetched data) */}
      <Suspense fallback={<EncounterListSkeleton />}>
        <EncounterList
          encounters={encounters}
          stats={stats}
        />
      </Suspense>
    </div>
  );
}

function EncounterListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
              <div>
                <div className="w-8 h-6 bg-slate-200 rounded mb-1"></div>
                <div className="w-16 h-3 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-slate-200 rounded-xl"></div>
        <div className="w-32 h-10 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="w-40 h-5 bg-slate-200 rounded"></div>
        </div>
        <div className="h-12 bg-slate-50 border-b"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-slate-100 flex items-center px-6 gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="w-32 h-4 bg-slate-200 rounded mb-1"></div>
              <div className="w-20 h-3 bg-slate-200 rounded"></div>
            </div>
            <div className="w-20 h-6 bg-slate-200 rounded-full"></div>
            <div className="w-20 h-6 bg-slate-200 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
