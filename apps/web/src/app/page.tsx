import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';

/**
 * Landing Page - Server Component
 *
 * Pharmacy-focused branding for Xoai Pharmacy Management System.
 *
 * SSR Implementation:
 * - Server-side session check for navigation customization
 * - Static content rendered on server
 * - No client-side JavaScript required for initial render
 */

export const metadata: Metadata = {
  title: 'Xoai Pharmacy - Modern Pharmacy Management System',
  description: 'Streamline your retail pharmacy workflow from intake to pickup. HIPAA-compliant, DEA-integrated, and built for efficiency.',
};

// Feature data for the features section
const features = [
  {
    icon: 'workflow',
    title: 'Complete Dispensing Workflow',
    description: 'End-to-end prescription processing from intake to pickup with real-time queue management.',
    color: 'blue',
  },
  {
    icon: 'claims',
    title: 'Real-time Claims Processing',
    description: 'NCPDP-compliant claim submission with automatic reject code resolution and override handling.',
    color: 'indigo',
  },
  {
    icon: 'pdmp',
    title: 'PDMP Integration',
    description: 'Integrated prescription drug monitoring program queries for controlled substance compliance.',
    color: 'purple',
  },
  {
    icon: 'inventory',
    title: 'Inventory Management',
    description: 'NDC-based inventory tracking with reorder alerts, expiration monitoring, and 340B support.',
    color: 'green',
  },
  {
    icon: 'willcall',
    title: 'Will-Call Management',
    description: 'Organized bin management, patient notifications, and automatic return-to-stock workflows.',
    color: 'orange',
  },
  {
    icon: 'audit',
    title: 'HIPAA Audit Logging',
    description: 'Comprehensive audit trails for all PHI access with 6-year retention for compliance.',
    color: 'teal',
  },
] as const;

// Stats data
const stats = [
  { label: 'Prescriptions Processed', value: '50K+', sublabel: 'Daily' },
  { label: 'Claims Success Rate', value: '98.5%', sublabel: 'First Pass' },
  { label: 'Average Fill Time', value: '< 8 min', sublabel: 'Queue to Ready' },
  { label: 'DEA Compliant', value: '100%', sublabel: 'Audit Ready' },
] as const;

// Icon components
function FeatureIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    workflow: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    claims: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    pdmp: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    inventory: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    willcall: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    audit: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    pill: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    play: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[type] || null;
}

// Color classes for features
const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
};

export default async function Home() {
  // Server-side session check for navigation customization
  const session = await getSession();
  const isAuthenticated = !!session?.user;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FeatureIcon type="pill" className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Xoai Pharmacy
              </span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                // Authenticated user navigation
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                // Guest navigation
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              HIPAA Compliant &middot; DEA Integrated &middot; NCPDP Certified
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
              Modern Pharmacy
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Streamline your retail pharmacy workflow from intake to pickup.
              Real-time claims processing, PDMP integration, and complete audit compliance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center gap-2"
                  >
                    <FeatureIcon type="play" className="w-5 h-5" />
                    Watch Demo
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm font-medium text-slate-700 mt-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Complete Dispensing Workflow
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From prescription intake to patient pickup, manage every step with precision.
            </p>
          </div>

          {/* Visual Workflow Pipeline */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {['Intake', 'Data Entry', 'Claims', 'Fill', 'Verify', 'Pickup'].map((stage, index) => (
              <div key={stage} className="flex items-center">
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg">
                  {stage}
                </div>
                {index < 5 && (
                  <svg className="w-6 h-6 text-slate-400 mx-2 hidden sm:block" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Run Your Pharmacy
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive tools for modern pharmacy operations, built with compliance in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const colors = colorClasses[feature.color] ?? colorClasses.blue;
              return (
                <div
                  key={feature.title}
                  className="group p-6 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-slate-200"
                >
                  <div className={`inline-flex p-3 rounded-xl ${colors?.bg ?? 'bg-blue-100'} ${colors?.text ?? 'text-blue-600'} mb-4`}>
                    <FeatureIcon type={feature.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Built for Compliance
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Xoai Pharmacy is designed from the ground up to meet the strictest healthcare regulations.
                Every action is logged, every record is encrypted, and every workflow is audit-ready.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'HIPAA Compliant', desc: 'AES-256-GCM encryption, audit logging, access controls' },
                  { title: 'DEA Integrated', desc: 'Controlled substance tracking, ARCOS reporting, perpetual inventory' },
                  { title: 'PDMP Connected', desc: 'Real-time queries to state prescription monitoring programs' },
                  { title: 'NCPDP Certified', desc: 'B1/B2/B3 transactions, reject code handling, claim reversals' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="p-1 bg-emerald-500 rounded-full mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-emerald-400 font-semibold">Security First</span>
              </div>
              <div className="space-y-3 text-sm font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span> Server-side session validation
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span> Role-based access control (RBAC)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span> PHI access audit logging
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span> Automatic session timeout
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span> 6-year log retention
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Modernize Your Pharmacy?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join pharmacies that trust Xoai for their dispensing workflows, claims processing, and compliance needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-blue-600 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-blue-600 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all"
                  >
                    Contact Sales
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <FeatureIcon type="pill" className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">Xoai Pharmacy</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">HIPAA</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Xoai Pharmacy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
