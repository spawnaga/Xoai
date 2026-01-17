'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut configuration for pharmacy workflow
 *
 * Standard keys:
 * - F1: Help / Patient Search
 * - F2: Accept / Approve
 * - F3: Triage / Next
 * - F4: Override DUR (pharmacist only)
 * - F5: Resubmit / Refresh
 * - F6: Scan Barcode
 * - F7: Capture Signature
 * - F8: Print Label
 * - F9: Complete Fill
 * - F10: Submit Form
 * - Esc: Cancel / Back
 * - Ctrl+S: Save
 * - Ctrl+N: New Note
 */

export type ShortcutKey =
  | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10'
  | 'Escape'
  | 'Ctrl+S' | 'Ctrl+N' | 'Ctrl+P'
  | 'Enter';

export interface ShortcutConfig {
  key: ShortcutKey;
  handler: () => void;
  description: string;
  disabled?: boolean;
  requiresPharmacist?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
  isPharmacist?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  isPharmacist = false,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      // Allow Escape and F-keys even in inputs
      if (!event.key.startsWith('F') && event.key !== 'Escape') {
        return;
      }
    }

    let shortcutKey: ShortcutKey | null = null;

    // Check for modifier combinations
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 's' || event.key === 'S') {
        shortcutKey = 'Ctrl+S';
      } else if (event.key === 'n' || event.key === 'N') {
        shortcutKey = 'Ctrl+N';
      } else if (event.key === 'p' || event.key === 'P') {
        shortcutKey = 'Ctrl+P';
      }
    } else {
      // Function keys and special keys
      if (event.key.startsWith('F') && event.key.length <= 3) {
        shortcutKey = event.key as ShortcutKey;
      } else if (event.key === 'Escape') {
        shortcutKey = 'Escape';
      } else if (event.key === 'Enter' && !event.shiftKey) {
        shortcutKey = 'Enter';
      }
    }

    if (!shortcutKey) return;

    const shortcut = shortcutsRef.current.find(s => s.key === shortcutKey);

    if (shortcut && !shortcut.disabled) {
      // Check pharmacist requirement
      if (shortcut.requiresPharmacist && !isPharmacist) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      shortcut.handler();
    }
  }, [enabled, isPharmacist]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

// Shortcut label helper
export function getShortcutLabel(key: ShortcutKey): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  if (key.startsWith('Ctrl+')) {
    return isMac ? `⌘${key.slice(5)}` : key;
  }

  if (key === 'Escape') {
    return 'Esc';
  }

  return key;
}

// Default pharmacy workflow shortcuts
export const PHARMACY_SHORTCUTS: Record<string, { key: ShortcutKey; description: string }> = {
  help: { key: 'F1', description: 'Help / Patient Search' },
  accept: { key: 'F2', description: 'Accept / Approve' },
  next: { key: 'F3', description: 'Triage / Next' },
  override: { key: 'F4', description: 'Override DUR' },
  refresh: { key: 'F5', description: 'Resubmit / Refresh' },
  scan: { key: 'F6', description: 'Scan Barcode' },
  signature: { key: 'F7', description: 'Capture Signature' },
  print: { key: 'F8', description: 'Print Label' },
  complete: { key: 'F9', description: 'Complete Fill' },
  submit: { key: 'F10', description: 'Submit Form' },
  cancel: { key: 'Escape', description: 'Cancel / Back' },
  save: { key: 'Ctrl+S', description: 'Save' },
  newNote: { key: 'Ctrl+N', description: 'New Note' },
};
