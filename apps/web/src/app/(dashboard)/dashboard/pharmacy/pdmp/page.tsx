import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

export const metadata = {
  title: 'PDMP Query | Xoai Healthcare',
  description: 'Prescription Drug Monitoring Program queries',
};

export default async function PDMPPage() {
  const session = await requireSession('/dashboard/pharmacy/pdmp');

  await logPHIAccess('VIEW', 'Pharmacy', 'pdmp', {
    section: 'pdmp-query',
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
          <h1 className="text-2xl font-bold text-slate-900">PDMP Query</h1>
          <p className="mt-1 text-slate-500">
            Query Prescription Drug Monitoring Program for controlled substances
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">PDMP Integration</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          State prescription drug monitoring program integration coming soon. Query patient controlled substance history before dispensing.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
