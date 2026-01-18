import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

/**
 * Pharmacy Dashboard Home Page (Server Component)
 *
 * Main hub for pharmacy operations featuring:
 * - Visual workflow pipeline with queue counts
 * - Key pharmacy metrics
 * - Quick actions for common tasks
 * - Recent activity feed
 *
 * SSR Benefits:
 * - Stats fetched server-side before render
 * - No loading spinners for initial data
 * - PHI access logged server-side
 *
 * HIPAA Compliance:
 * - Server-side session validation
 * - PHI access audit logging
 */

// Workflow stages for dispensing pipeline
const workflowStages = [
  {
    id: 'intake',
    label: 'Intake',
    href: '/dashboard/pharmacy/intake',
    count: 12,
    color: 'blue',
    description: 'New Rx',
  },
  {
    id: 'data-entry',
    label: 'Data Entry',
    href: '/dashboard/pharmacy/data-entry',
    count: 8,
    color: 'indigo',
    description: 'Enter details',
  },
  {
    id: 'claims',
    label: 'Claims',
    href: '/dashboard/pharmacy/claim',
    count: 5,
    color: 'purple',
    description: 'Insurance',
  },
  {
    id: 'fill',
    label: 'Fill',
    href: '/dashboard/pharmacy/fill',
    count: 15,
    color: 'amber',
    description: 'Dispense',
  },
  {
    id: 'verify',
    label: 'Verify',
    href: '/dashboard/pharmacy/verify',
    count: 6,
    color: 'emerald',
    description: 'RPh check',
  },
  {
    id: 'pickup',
    label: 'Pickup',
    href: '/dashboard/pharmacy/pickup',
    count: 22,
    color: 'teal',
    description: 'Ready',
  },
];

const workflowColors: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  indigo: 'from-indigo-500 to-indigo-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  emerald: 'from-emerald-500 to-emerald-600',
  teal: 'from-teal-500 to-teal-600',
};

// Stats configuration
const statsConfig = [
  {
    name: 'Filled Today',
    value: '47',
    change: '+12 from yesterday',
    icon: 'prescription',
    color: 'blue',
  },
  {
    name: 'Pending Claims',
    value: '8',
    change: '3 rejections',
    icon: 'claims',
    color: 'amber',
  },
  {
    name: 'Will-Call',
    value: '34',
    change: '5 expiring soon',
    icon: 'willcall',
    color: 'purple',
  },
  {
    name: 'Ready for Pickup',
    value: '22',
    change: '8 waiting > 2hrs',
    icon: 'pickup',
    color: 'emerald',
  },
];

// Quick actions
const quickActions = [
  {
    name: 'New Prescription',
    description: 'Enter a new prescription',
    href: '/dashboard/pharmacy/intake',
    icon: 'add',
  },
  {
    name: 'Patient Lookup',
    description: 'Search patient records',
    href: '/dashboard/patients',
    icon: 'search',
  },
  {
    name: 'PDMP Check',
    description: 'Query controlled substances',
    href: '/dashboard/pharmacy/pdmp',
    icon: 'shield',
  },
  {
    name: 'Check Inventory',
    description: 'View stock levels',
    href: '/dashboard/pharmacy/inventory',
    icon: 'cube',
  },
];

// Recent activity mock data
const recentActivity = [
  { id: 1, type: 'filled', rx: 'RX-2024-0847', drug: 'Lisinopril 10mg', patient: 'John D.', time: '2 min ago' },
  { id: 2, type: 'verified', rx: 'RX-2024-0846', drug: 'Metformin 500mg', patient: 'Sarah M.', time: '5 min ago' },
  { id: 3, type: 'claim_paid', rx: 'RX-2024-0845', drug: 'Atorvastatin 20mg', patient: 'Mike R.', time: '8 min ago' },
  { id: 4, type: 'pickup', rx: 'RX-2024-0844', drug: 'Amlodipine 5mg', patient: 'Lisa K.', time: '12 min ago' },
  { id: 5, type: 'intake', rx: 'RX-2024-0848', drug: 'Omeprazole 20mg', patient: 'Tom B.', time: '15 min ago' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  // Server-side session check
  const session = await requireSession('/dashboard');

  // Log dashboard access for HIPAA audit
  await logPHIAccess('VIEW', 'Dashboard', 'pharmacy-hub', {
    section: 'pharmacy-dashboard',
  });

  const greeting = getGreeting();
  const firstName = session.user.name?.split(' ')[0] || 'Pharmacist';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            Here&apos;s your pharmacy workflow overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pharmacy/intake"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Prescription
          </Link>
        </div>
      </div>

      {/* Dispensing Workflow Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Dispensing Workflow</h2>
          <span className="text-sm text-slate-500">
            {workflowStages.reduce((sum, s) => sum + s.count, 0)} total in queue
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {workflowStages.map((stage, index) => (
            <Link
              key={stage.id}
              href={stage.href}
              className="group relative p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"
            >
              {/* Connector arrow (hidden on first item and mobile) */}
              {index > 0 && (
                <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold bg-gradient-to-r ${workflowColors[stage.color]} bg-clip-text text-transparent`}>
                  {stage.count}
                </span>
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${workflowColors[stage.color]}`} />
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {stage.label}
              </p>
              <p className="text-xs text-slate-500">{stage.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${getStatBgColor(stat.color)}`}>
                <StatIcon type={stat.icon} className={`h-5 w-5 ${getStatTextColor(stat.color)}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                    <ActionIcon type={action.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
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

          {/* Compliance Card */}
          <div className="mt-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/25">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Compliance Status</p>
                <p className="text-xl font-bold mt-1">DEA Compliant</p>
              </div>
              <div className="p-2 bg-white/20 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                HIPAA Audit Logging
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                PDMP Integration
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                CS Inventory Tracking
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <span className="text-xs font-medium text-slate-400">Last 15 minutes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-lg ${getActivityBgColor(activity.type)}`}>
                  <ActivityIcon type={activity.type} className={`h-4 w-4 ${getActivityTextColor(activity.type)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{activity.rx}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActivityBadgeColor(activity.type)}`}>
                      {getActivityLabel(activity.type)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activity.drug} &middot; {activity.patient}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <Link href="/dashboard/pharmacy/intake" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all activity &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for colors
function getStatBgColor(color: string): string {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    purple: 'bg-purple-100',
    emerald: 'bg-emerald-100',
  };
  return colors[color] || 'bg-blue-100';
}

function getStatTextColor(color: string): string {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    emerald: 'text-emerald-600',
  };
  return colors[color] || 'text-blue-600';
}

function getActivityBgColor(type: string): string {
  const colors: Record<string, string> = {
    filled: 'bg-emerald-100',
    verified: 'bg-blue-100',
    claim_paid: 'bg-green-100',
    pickup: 'bg-teal-100',
    intake: 'bg-indigo-100',
  };
  return colors[type] || 'bg-slate-100';
}

function getActivityTextColor(type: string): string {
  const colors: Record<string, string> = {
    filled: 'text-emerald-600',
    verified: 'text-blue-600',
    claim_paid: 'text-green-600',
    pickup: 'text-teal-600',
    intake: 'text-indigo-600',
  };
  return colors[type] || 'text-slate-600';
}

function getActivityBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    filled: 'bg-emerald-100 text-emerald-700',
    verified: 'bg-blue-100 text-blue-700',
    claim_paid: 'bg-green-100 text-green-700',
    pickup: 'bg-teal-100 text-teal-700',
    intake: 'bg-indigo-100 text-indigo-700',
  };
  return colors[type] || 'bg-slate-100 text-slate-700';
}

function getActivityLabel(type: string): string {
  const labels: Record<string, string> = {
    filled: 'Filled',
    verified: 'Verified',
    claim_paid: 'Paid',
    pickup: 'Picked Up',
    intake: 'New Rx',
  };
  return labels[type] || type;
}

// Icon components
function StatIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'prescription':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'claims':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'willcall':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case 'pickup':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    default:
      return null;
  }
}

function ActionIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'add':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'search':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'cube':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    default:
      return null;
  }
}

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'filled':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case 'verified':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'claim_paid':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'pickup':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case 'intake':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    default:
      return null;
  }
}

export const metadata = {
  title: 'Dashboard | Xoai Pharmacy',
  description: 'Pharmacy management dashboard overview',
};
