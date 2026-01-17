import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

/**
 * Pharmacy Dashboard Page (Server Component)
 *
 * Central hub for pharmacy operations including:
 * - Prescription intake and verification
 * - PDMP queries
 * - Immunization administration
 * - Inventory management
 * - Will-call management
 * - Prescription transfers
 */

export const metadata = {
  title: 'Pharmacy | Xoai Healthcare',
  description: 'Pharmacy operations dashboard',
};

// Pharmacy module cards
const modules = [
  {
    title: 'Prescription Intake',
    description: 'Process new prescriptions from e-prescribe, fax, phone, and walk-ins',
    href: '/dashboard/pharmacy/intake',
    icon: 'clipboard',
    color: 'blue',
    stats: 'New Rx Queue',
  },
  {
    title: 'PDMP Query',
    description: 'Query prescription drug monitoring program for controlled substances',
    href: '/dashboard/pharmacy/pdmp',
    icon: 'search',
    color: 'purple',
    stats: 'CS Monitoring',
  },
  {
    title: 'Immunizations',
    description: 'Administer vaccines, manage standing orders, and track records',
    href: '/dashboard/pharmacy/immunizations',
    icon: 'syringe',
    color: 'green',
    stats: 'Vaccines',
  },
  {
    title: 'Inventory',
    description: 'Manage vaccine inventory, temperature monitoring, and storage units',
    href: '/dashboard/pharmacy/inventory',
    icon: 'box',
    color: 'orange',
    stats: 'Stock Mgmt',
  },
  {
    title: 'Will-Call',
    description: 'Manage prescription bins, patient pickups, and return-to-stock',
    href: '/dashboard/pharmacy/will-call',
    icon: 'bell',
    color: 'teal',
    stats: 'Ready for Pickup',
  },
  {
    title: 'Transfers',
    description: 'Transfer prescriptions in and out with other pharmacies',
    href: '/dashboard/pharmacy/transfers',
    icon: 'arrows',
    color: 'indigo',
    stats: 'Rx Transfers',
  },
  {
    title: 'Staff Management',
    description: 'Manage pharmacy staff, roles, and permissions',
    href: '/dashboard/pharmacy/staff',
    icon: 'users',
    color: 'slate',
    stats: 'Team',
  },
  {
    title: 'Standing Orders',
    description: 'Manage vaccine standing orders and protocols',
    href: '/dashboard/pharmacy/standing-orders',
    icon: 'document',
    color: 'rose',
    stats: 'Protocols',
  },
];

// Icon component
function ModuleIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    clipboard: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    search: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    syringe: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    box: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    bell: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    arrows: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    document: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };
  return <>{icons[type] || null}</>;
}

// Color classes for modules
const colorClasses: Record<string, { bg: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:border-blue-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:border-purple-300' },
  green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:border-green-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:border-orange-300' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'hover:border-teal-300' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:border-indigo-300' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', hover: 'hover:border-slate-300' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', hover: 'hover:border-rose-300' },
};

export default async function PharmacyPage() {
  // Server-side session check
  const session = await requireSession('/dashboard/pharmacy');

  // Log PHI access for HIPAA audit trail
  await logPHIAccess('VIEW', 'Pharmacy', 'dashboard', {
    section: 'pharmacy-dashboard',
    userId: session.user.id,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Pharmacy</h1>
          <p className="mt-1 text-slate-500">
            Manage prescriptions, immunizations, and pharmacy operations
          </p>
        </div>
        <Link
          href="/dashboard/medications/prescribe"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Prescription
        </Link>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((module) => {
          const colors = colorClasses[module.color] || colorClasses.blue;
          return (
            <Link
              key={module.href}
              href={module.href}
              className={`group p-5 bg-white rounded-2xl border border-slate-200 ${colors.hover} hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
                  <ModuleIcon type={module.icon} className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {module.stats}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                {module.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2">
                {module.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/pharmacy/intake"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Process Rx
          </Link>
          <Link
            href="/dashboard/pharmacy/pdmp"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
          >
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            PDMP Check
          </Link>
          <Link
            href="/dashboard/pharmacy/immunizations"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Give Vaccine
          </Link>
          <Link
            href="/dashboard/pharmacy/will-call"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
          >
            <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
            Pickup Ready
          </Link>
        </div>
      </div>
    </div>
  );
}
