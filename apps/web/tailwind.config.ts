import type { Config } from 'tailwindcss';

const sharedConfig = require('@xoai/tailwind-config/tailwind.config.js');

const config: Config = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Dynamic color classes for quick actions
    { pattern: /bg-(blue|emerald|amber|purple|indigo|teal|orange|green)-(50|100|200)/ },
    { pattern: /text-(blue|emerald|amber|purple|indigo|teal|orange|green)-(600|700)/ },
    { pattern: /border-(blue|emerald|amber|purple|indigo|teal|orange|green)-(300)/ },
    { pattern: /hover:bg-(blue|emerald|amber|purple|indigo|teal|orange|green)-(50|200)/ },
    { pattern: /hover:border-(blue|emerald|amber|purple|indigo|teal|orange|green)-(300)/ },
    { pattern: /group-hover:bg-(blue|emerald|amber|purple|indigo|teal|orange|green)-(200)/ },
  ],
  theme: {
    extend: {
      colors: {
        // Healthcare-specific colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};

export default config;