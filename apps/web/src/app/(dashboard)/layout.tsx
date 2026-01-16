import { requireSession, logPHIAccess } from '@/lib/auth';
import { DashboardSidebar, DashboardHeader } from '@/components/dashboard/sidebar';
import { SessionTimeoutWarning } from '@/components/session/session-timeout-warning';

/**
 * Dashboard Layout (Server Component)
 *
 * Security Features:
 * - Server-side authentication check (no client-side bypass)
 * - Session validation before rendering
 * - PHI access logging for HIPAA compliance
 * - User context passed to client components
 *
 * HIPAA Compliance:
 * - § 164.312(d): Person or Entity Authentication
 * - § 164.312(b): Audit Controls
 */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session check - redirects to login if not authenticated
  // This runs BEFORE any content is rendered to the client
  const session = await requireSession('/dashboard');

  // Log dashboard access for audit trail
  await logPHIAccess('VIEW', 'Dashboard', 'layout', {
    section: 'dashboard',
  });

  // Extract user data for client components
  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HIPAA-compliant session timeout warning */}
      <SessionTimeoutWarning maxAge={24 * 60 * 60} />

      {/* Client-side sidebar with user data from server */}
      <DashboardSidebar user={user} />

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Desktop header */}
        <DashboardHeader user={user} />

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Metadata for dashboard pages
 */
export const metadata = {
  title: 'Dashboard | Xoai Healthcare',
  description: 'HIPAA-compliant healthcare management dashboard',
};
