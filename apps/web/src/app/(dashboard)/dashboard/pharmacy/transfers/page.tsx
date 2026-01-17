import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

export const metadata = {
  title: 'Transfers | Xoai Healthcare',
  description: 'Prescription transfer management',
};

export default async function TransfersPage() {
  const session = await requireSession('/dashboard/pharmacy/transfers');

  await logPHIAccess('VIEW', 'Pharmacy', 'transfers', {
    section: 'rx-transfers',
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
          <h1 className="text-2xl font-bold text-slate-900">Prescription Transfers</h1>
          <p className="mt-1 text-slate-500">
            Transfer prescriptions in and out with other pharmacies
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Transfer Module</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Handle prescription transfers in and out, verify pharmacy credentials, and track transfer history coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
