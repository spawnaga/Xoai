'use client';

import { useActionState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginAction, type AuthState } from '@/app/(auth)/actions';

const initialState: AuthState = {};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  // Handle successful credential validation - complete login with NextAuth
  useEffect(() => {
    if (state.success) {
      // Get form data from the form element
      const form = document.querySelector('form');
      if (form) {
        const formData = new FormData(form);
        signIn('credentials', {
          username: formData.get('username'),
          password: formData.get('password'),
          redirect: true,
          callbackUrl: '/dashboard',
        });
      }
    }
  }, [state.success, router]);

  const showRegisteredMessage = searchParams.get('registered') === 'true';

  return (
    <form action={formAction} className="space-y-6" autoComplete="on">
      {showRegisteredMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          Registration successful! Please sign in with your credentials.
        </div>
      )}

      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="Enter your username"
          aria-describedby={state.errors?.username ? 'username-error' : undefined}
        />
        {state.errors?.username && (
          <p id="username-error" className="mt-1 text-sm text-red-600">
            {state.errors.username[0]}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="••••••••"
          aria-describedby={state.errors?.password ? 'password-error' : undefined}
        />
        {state.errors?.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600">
            {state.errors.password[0]}
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
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
