'use client';

import { useActionState } from 'react';
import { registerAction, type AuthState } from '@/app/(auth)/actions';

const initialState: AuthState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4" autoComplete="on">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
          Username *
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="Choose a username"
          aria-describedby={state.errors?.username ? 'username-error' : undefined}
        />
        <p className="mt-1 text-xs text-slate-500">
          Letters, numbers, and underscores only
        </p>
        {state.errors?.username && (
          <p id="username-error" className="mt-1 text-sm text-red-600">
            {state.errors.username[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            placeholder="John"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
          Email address (for password recovery)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="you@example.com"
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
        {state.errors?.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
          Password *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="••••••••"
          aria-describedby={state.errors?.password ? 'password-error' : undefined}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Min 8 characters with uppercase, lowercase, number, and special character
        </p>
        {state.errors?.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
          Confirm password *
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="••••••••"
          aria-describedby={state.errors?.confirmPassword ? 'confirm-password-error' : undefined}
        />
        {state.errors?.confirmPassword && (
          <p id="confirm-password-error" className="mt-1 text-sm text-red-600">
            {state.errors.confirmPassword[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create account'
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        By creating an account, you agree to our{' '}
        <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
      </p>
    </form>
  );
}
