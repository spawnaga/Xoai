import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';

export const metadata = {
  title: 'Staff Management | Xoai Healthcare',
  description: 'Pharmacy staff and roles management',
};

export default async function StaffPage() {
  const session = await requireSession('/dashboard/pharmacy/staff');

  await logPHIAccess('VIEW', 'Pharmacy', 'staff', {
    section: 'staff-management',
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
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="mt-1 text-slate-500">
            Manage pharmacy staff, roles, and permissions
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Staff Module</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Manage pharmacists, technicians, and other staff. Assign roles, track credentials, and handle scheduling coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
