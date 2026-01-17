import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

export const metadata = {
  title: 'Standing Orders | Xoai Healthcare',
  description: 'Vaccine standing orders and protocols',
};

export default async function StandingOrdersPage() {
  const session = await requireSession('/dashboard/pharmacy/standing-orders');

  await logPHIAccess('VIEW', 'Pharmacy', 'standing-orders', {
    section: 'standing-orders',
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
          <h1 className="text-2xl font-bold text-slate-900">Standing Orders</h1>
          <p className="mt-1 text-slate-500">
            Manage vaccine standing orders and protocols
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Standing Orders</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Manage vaccine protocols, collaborative practice agreements, and prescriptive authority coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
