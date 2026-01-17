'use client';

import { useState, useEffect } from 'react';
import { PHARMACY_SHORTCUTS, getShortcutLabel } from '@/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsProps {
  context?: 'intake' | 'data-entry' | 'claim' | 'fill' | 'verify' | 'pickup' | 'general';
  isPharmacist?: boolean;
}

const contextShortcuts: Record<string, string[]> = {
  intake: ['help', 'accept', 'next', 'cancel', 'save'],
  'data-entry': ['help', 'submit', 'scan', 'save', 'cancel', 'newNote'],
  claim: ['help', 'submit', 'refresh', 'cancel'],
  fill: ['help', 'scan', 'print', 'complete', 'cancel'],
  verify: ['help', 'accept', 'override', 'scan', 'cancel'],
  pickup: ['help', 'signature', 'print', 'complete', 'cancel'],
  general: ['help', 'save', 'cancel'],
};

export function KeyboardShortcuts({ context = 'general', isPharmacist = false }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle with F1
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all text-slate-600 hover:text-slate-900 z-40"
        title="Keyboard shortcuts (F1)"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  const relevantShortcuts = contextShortcuts[context] || contextShortcuts.general;
  const allShortcuts = Object.entries(PHARMACY_SHORTCUTS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Context shortcuts */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {context.replace('-', ' ')} Shortcuts
            </h3>
            <div className="grid gap-2">
              {allShortcuts
                .filter(([key]) => relevantShortcuts.includes(key))
                .map(([key, shortcut]) => {
                  const isPharmacistOnly = key === 'override';
                  const isDisabled = isPharmacistOnly && !isPharmacist;

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        isDisabled ? 'bg-slate-50 opacity-50' : 'bg-slate-50'
                      }`}
                    >
                      <span className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>
                        {shortcut.description}
                        {isPharmacistOnly && (
                          <span className="ml-2 text-xs text-amber-600">(RPh only)</span>
                        )}
                      </span>
                      <kbd className={`px-2 py-1 text-xs font-mono rounded ${
                        isDisabled
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {getShortcutLabel(shortcut.key)}
                      </kbd>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* All shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              All Shortcuts
            </h3>
            <div className="grid gap-2">
              {allShortcuts.map(([key, shortcut]) => {
                const isPharmacistOnly = key === 'override';
                const isDisabled = isPharmacistOnly && !isPharmacist;

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      isDisabled ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-600'}`}>
                      {shortcut.description}
                      {isPharmacistOnly && (
                        <span className="ml-2 text-xs text-amber-600">(RPh only)</span>
                      )}
                    </span>
                    <kbd className={`px-2 py-1 text-xs font-mono rounded ${
                      isDisabled
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {getShortcutLabel(shortcut.key)}
                    </kbd>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">Esc</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">F1</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

// Inline shortcut hint component
export function ShortcutHint({ shortcutKey, className = '' }: { shortcutKey: string; className?: string }) {
  const shortcut = PHARMACY_SHORTCUTS[shortcutKey];
  if (!shortcut) return null;

  return (
    <kbd className={`px-1.5 py-0.5 text-xs font-mono bg-slate-100 text-slate-500 rounded ${className}`}>
      {getShortcutLabel(shortcut.key)}
    </kbd>
  );
}
