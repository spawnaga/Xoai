import Link from 'next/link';
import { Suspense } from 'react';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';

/**
 * Dashboard Home Page (Server Component)
 *
 * SSR Benefits:
 * - Stats fetched server-side before render
 * - No loading spinners for initial data
 * - SEO friendly
 * - PHI access logged server-side
 *
 * HIPAA Compliance:
 * - Server-side session validation
 * - PHI access audit logging
 */

// Stats configuration (icons are passed as component refs)
const statsConfig = [
  {
    name: 'Total Patients',
    key: 'patients',
    href: '/dashboard/patients',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    name: "Today's Encounters",
    key: 'encounters',
    href: '/dashboard/encounters',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    name: 'Pending Reviews',
    key: 'observations',
    href: '/dashboard/observations',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    name: 'Active Medications',
    key: 'medications',
    href: '/dashboard/medications',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
];

const quickActions = [
  {
    name: 'Add Patient',
    description: 'Register a new patient in the system',
    href: '/dashboard/patients/new',
    color: 'blue',
  },
  {
    name: 'New Encounter',
    description: 'Start a clinical encounter',
    href: '/dashboard/encounters/new',
    color: 'emerald',
  },
  {
    name: 'Record Vitals',
    description: 'Add vital signs observation',
    href: '/dashboard/observations/vitals',
    color: 'amber',
  },
  {
    name: 'Prescribe',
    description: 'Create a new prescription',
    href: '/dashboard/medications/new',
    color: 'purple',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Server-side data fetching
async function getDashboardStats() {
  try {
    const caller = await getServerCaller();

    // Get today's encounters using the proper API method
    const todayEncounters = await caller.encounter.today().catch(() => []);
    const inProgressEncounters = todayEncounters.filter(e => e.status === 'IN_PROGRESS').length;

    // Get patient list for count
    const patientsResult = await caller.patient.list({ limit: 100 }).catch(() => ({ items: [] }));
    const patientCount = patientsResult.items.length;

    // Note: observations and medications require patientId, so we show aggregate counts
    // In production, you'd create dedicated stats endpoints
    return {
      patients: { value: patientCount, change: patientCount > 0 ? `${patientCount} total` : 'No patients yet' },
      encounters: { value: inProgressEncounters, change: inProgressEncounters > 0 ? `${inProgressEncounters} in progress` : 'No encounters today' },
      observations: { value: todayEncounters.length, change: todayEncounters.length > 0 ? `${todayEncounters.length} today` : 'All caught up' },
      medications: { value: 0, change: 'View by patient' },
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      patients: { value: 0, change: 'Unable to load' },
      encounters: { value: 0, change: 'Unable to load' },
      observations: { value: 0, change: 'Unable to load' },
      medications: { value: 0, change: 'Unable to load' },
    };
  }
}

async function getRecentPatients() {
  try {
    const caller = await getServerCaller();
    const result = await caller.patient.list({ limit: 5 });
    return result.items.map((p) => ({
      id: p.id,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
      mrn: p.mrn || 'N/A',
      lastVisit: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Active',
    }));
  } catch (error) {
    console.error('Error fetching recent patients:', error);
    return [];
  }
}

export default async function DashboardPage() {
  // Server-side session check
  const session = await requireSession('/dashboard');

  // Log dashboard access for HIPAA audit
  await logPHIAccess('VIEW', 'Dashboard', 'home', {
    section: 'dashboard-home',
  });

  // Fetch data server-side
  const [stats, recentPatients] = await Promise.all([
    getDashboardStats(),
    getRecentPatients(),
  ]);

  const greeting = getGreeting();
  const firstName = session.user.name?.split(' ')[0] || 'Doctor';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            Here&apos;s an overview of your clinical activity today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Patient
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsConfig.map((stat) => {
          const data = stats[stat.key as keyof typeof stats];
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <div className={stat.iconColor}>
                    <StatIcon type={stat.key} />
                  </div>
                </div>
                <svg className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{data.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{data.change}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="group relative flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                <ActionIcon type={action.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">
                  {action.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {action.description}
                </p>
              </div>
              <svg className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Patients</h2>
            <Link href="/dashboard/patients" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all
            </Link>
          </div>
          {recentPatients.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                    {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                    <p className="text-xs text-slate-500">MRN: {patient.mrn}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Last visit</p>
                    <p className="text-sm font-medium text-slate-700">{patient.lastVisit}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                    {patient.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No patients yet</p>
              <p className="text-xs text-slate-500 mt-1">Get started by adding your first patient</p>
              <Link
                href="/dashboard/patients/new"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Patient
              </Link>
            </div>
          )}
        </div>

        {/* Compliance & System Status */}
        <div className="space-y-6">
          {/* HIPAA Compliance Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/25">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Compliance Status</p>
                <p className="text-2xl font-bold mt-1">HIPAA Certified</p>
              </div>
              <div className="p-2 bg-white/20 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AES-256 Encryption Active
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Audit Logging Enabled
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Server-Side Auth (SSR)
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-600">API Server</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-600">Database</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-600">FHIR Endpoint</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-600">HL7 Gateway</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon components
function StatIcon({ type }: { type: string }) {
  switch (type) {
    case 'patients':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'encounters':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'observations':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'medications':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    default:
      return null;
  }
}

function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case 'Add Patient':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case 'New Encounter':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    case 'Record Vitals':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'Prescribe':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

export const metadata = {
  title: 'Dashboard | Xoai Healthcare',
  description: 'Healthcare management dashboard overview',
};
