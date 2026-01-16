'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * Session Timeout Warning Component
 *
 * HIPAA Compliance:
 * - § 164.312(a)(2)(iii): Automatic logoff
 * - § 164.312(d): Session management
 *
 * Features:
 * - Warns user 5 minutes before session expires
 * - Allows user to extend session
 * - Automatic logout when session expires
 * - Inactivity detection
 */

const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes of inactivity

interface SessionTimeoutWarningProps {
  /** Session duration in seconds (from NextAuth config) */
  maxAge?: number;
}

export function SessionTimeoutWarning({ maxAge = 24 * 60 * 60 }: SessionTimeoutWarningProps) {
  const { data: session, update } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Extend session
  const extendSession = useCallback(async () => {
    setShowWarning(false);
    setLastActivity(Date.now());
    // Trigger session refresh
    await update();
  }, [update]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/login?reason=timeout' });
  }, []);

  // Monitor activity and session
  useEffect(() => {
    if (!session) return;

    // Activity listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const throttledUpdate = throttle(updateActivity, 1000);

    events.forEach((event) => {
      document.addEventListener(event, throttledUpdate, { passive: true });
    });

    // Check session and inactivity
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;

      // Check inactivity timeout
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        handleLogout();
        return;
      }

      // Check session expiry
      if (session.expires) {
        const expiryTime = new Date(session.expires).getTime();
        const remaining = expiryTime - now;

        setTimeRemaining(remaining);

        // Show warning before expiry
        if (remaining <= WARNING_TIME && remaining > 0) {
          setShowWarning(true);
        }

        // Session expired
        if (remaining <= 0) {
          handleLogout();
        }
      }

      // Check inactivity warning
      if (inactiveTime >= INACTIVITY_TIMEOUT - WARNING_TIME) {
        setShowWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledUpdate);
      });
      clearInterval(checkInterval);
    };
  }, [session, lastActivity, updateActivity, handleLogout]);

  if (!showWarning || !session) {
    return null;
  }

  const minutes = Math.floor((timeRemaining || 0) / 60000);
  const seconds = Math.floor(((timeRemaining || 0) % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Warning Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Session Expiring</h2>
              <p className="text-amber-100 text-sm">Your session is about to expire</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-4">
              <span className="text-3xl font-bold text-amber-600">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
            <p className="text-slate-600">
              Due to HIPAA security requirements, your session will expire in {minutes} minutes and {seconds} seconds.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Click &quot;Continue Session&quot; to stay logged in, or you will be automatically logged out.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Log Out Now
            </button>
            <button
              onClick={extendSession}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Continue Session
            </button>
          </div>
        </div>

        {/* HIPAA Notice */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            HIPAA Security Rule § 164.312(a)(2)(iii) - Automatic Logoff
          </p>
        </div>
      </div>
    </div>
  );
}

// Utility function to throttle events
function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
