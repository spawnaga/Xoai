import Link from 'next/link';
import { Suspense } from 'react';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';
import { PatientList } from '@/components/patients/patient-list';

/**
 * Patients Page (Server Component)
 *
 * SSR Benefits:
 * - Patient list fetched server-side before render
 * - PHI access logged before data is exposed
 * - SEO friendly (though dashboard is private)
 *
 * HIPAA Compliance:
 * - Server-side session validation
 * - PHI access audit logging before data fetch
 */

export const metadata = {
  title: 'Patients | Xoai Healthcare',
  description: 'Patient management dashboard',
};

async function getPatients() {
  try {
    const caller = await getServerCaller();
    const result = await caller.patient.list({ limit: 100 });
    return result.items;
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

export default async function PatientsPage() {
  // Server-side session check
  const session = await requireSession('/dashboard/patients');

  // Log PHI access for HIPAA audit trail
  await logPHIAccess('VIEW', 'Patient', 'list', {
    section: 'patients-list',
    userId: session.user.id,
  });

  // Fetch patients server-side
  const patients = await getPatients();

  // Calculate stats
  const totalCount = patients.length;
  const activeCount = patients.length; // All patients are considered active

  return (
    <div className="space-y-6">
      {/* Header (Server-rendered) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Patients</h1>
          <p className="mt-1 text-slate-500">
            Manage patient records and information
          </p>
        </div>
        <Link
          href="/dashboard/patients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Patient
        </Link>
      </div>

      {/* Patient List (Client Component with server-fetched data) */}
      <Suspense fallback={<PatientListSkeleton />}>
        <PatientList
          patients={patients}
          totalCount={totalCount}
          activeCount={activeCount}
        />
      </Suspense>
    </div>
  );
}

function PatientListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Search skeleton */}
      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-slate-200 rounded-xl"></div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        </div>
      </div>

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

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="h-12 bg-slate-50 border-b"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-slate-100 flex items-center px-6 gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="w-32 h-4 bg-slate-200 rounded mb-1"></div>
              <div className="w-20 h-3 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
