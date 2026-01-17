import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

export const metadata = {
  title: 'Will-Call | Xoai Healthcare',
  description: 'Manage prescription bins and patient pickups',
};

export default async function WillCallPage() {
  const session = await requireSession('/dashboard/pharmacy/will-call');

  await logPHIAccess('VIEW', 'Pharmacy', 'will-call', {
    section: 'will-call-bins',
    userId: session.user.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pharmacy"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Will-Call Management</h1>
          <p className="mt-1 text-slate-500">
            Manage prescription bins, patient pickups, and return-to-stock
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Will-Call Bin Management</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Track prescription bins, manage return-to-stock workflows, and handle patient notifications. Use the Pickup station for active dispensing.
        </p>
        <Link
          href="/dashboard/pharmacy/pickup"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-teal-700 hover:to-emerald-700 transition-all"
        >
          Go to Pickup Station
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
