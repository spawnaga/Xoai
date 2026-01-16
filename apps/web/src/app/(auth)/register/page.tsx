import Link from 'next/link';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Create Account - Xoai Healthcare',
  description: 'Create your HIPAA-compliant healthcare platform account',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Xoai
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Create an account</h2>
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Client-side form with server action - Progressive Enhancement */}
          <Suspense fallback={<RegisterFormSkeleton />}>
            <RegisterForm />
          </Suspense>

          {/* HIPAA Security Notice (Server-rendered) */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Protected Health Information</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Your account will provide access to PHI. All activities are logged for HIPAA compliance.
                  Provide an email to enable password recovery via Google.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Benefits (Server Component) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Xoai</span>
          </div>
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the healthcare revolution
          </h1>

          <div className="space-y-4">
            <BenefitItem icon="🏥" text="FHIR R4 & HL7 v2.x compliant" />
            <BenefitItem icon="🔒" text="HIPAA-compliant security" />
            <BenefitItem icon="🤖" text="AI-powered clinical decision support" />
            <BenefitItem icon="📊" text="Real-time analytics dashboard" />
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © {new Date().getFullYear()} Xoai Healthcare. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-blue-100">
      <span className="text-2xl">{icon}</span>
      <span className="text-lg">{text}</span>
    </div>
  );
}

// Loading skeleton for form
function RegisterFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
        <div className="h-12 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
          <div className="h-12 bg-slate-200 rounded-xl"></div>
        </div>
        <div>
          <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
          <div className="h-12 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
      <div>
        <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
        <div className="h-12 bg-slate-200 rounded-xl"></div>
      </div>
      <div>
        <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
        <div className="h-12 bg-slate-200 rounded-xl"></div>
      </div>
      <div>
        <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
        <div className="h-12 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="h-12 bg-slate-200 rounded-xl"></div>
    </div>
  );
}
