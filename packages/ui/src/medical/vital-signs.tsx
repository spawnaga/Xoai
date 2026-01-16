'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface VitalSign {
  code: string;
  name: string;
  value: number | null;
  unit: string;
  normalRange?: { min: number; max: number };
  recordedAt?: Date;
}

export interface VitalSignsProps {
  vitals: VitalSign[];
  className?: string;
  compact?: boolean;
  showTrends?: boolean;
}

const VITAL_ICONS: Record<string, string> = {
  '8480-6': '\u{1FAC0}', // Systolic BP - heart
  '8462-4': '\u{1FAC0}', // Diastolic BP - heart
  '8867-4': '\u{1F493}', // Heart Rate - beating heart
  '9279-1': '\u{1F32C}', // Respiratory Rate - wind
  '8310-5': '\u{1F321}', // Temperature - thermometer
  '2708-6': '\u{1F4A8}', // O2 Saturation - dash
  '29463-7': '\u{2696}', // Weight - scale
  '8302-2': '\u{1F4CF}', // Height - ruler
};

const VITAL_COLORS: Record<string, { normal: string; warning: string; critical: string }> = {
  default: {
    normal: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    critical: 'bg-red-50 border-red-200 text-red-900',
  },
};

function getVitalStatus(
  vital: VitalSign
): 'normal' | 'warning' | 'critical' {
  if (!vital.normalRange || vital.value === null) return 'normal';

  const { min, max } = vital.normalRange;
  const value = vital.value;

  // Critical if more than 20% outside range
  const range = max - min;
  const criticalMargin = range * 0.2;

  if (value < min - criticalMargin || value > max + criticalMargin) {
    return 'critical';
  }

  if (value < min || value > max) {
    return 'warning';
  }

  return 'normal';
}

function VitalSignCard({ vital, compact }: { vital: VitalSign; compact?: boolean }) {
  const status = getVitalStatus(vital);
  const colors = VITAL_COLORS.default[status];
  const icon = VITAL_ICONS[vital.code] || '\u{1F4CA}';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 rounded-md border px-3 py-2', colors)}>
        <span className="text-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{vital.name}</p>
          <p className="font-semibold">
            {vital.value ?? '-'}
            <span className="text-xs font-normal ml-1">{vital.unit}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-4', colors)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {vital.recordedAt && (
          <span className="text-xs text-gray-500">
            {vital.recordedAt.toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-600">{vital.name}</p>
      <p className="text-2xl font-bold">
        {vital.value ?? '-'}
        <span className="text-sm font-normal text-gray-500 ml-1">{vital.unit}</span>
      </p>
      {vital.normalRange && (
        <p className="text-xs text-gray-500 mt-1">
          Normal: {vital.normalRange.min}-{vital.normalRange.max} {vital.unit}
        </p>
      )}
    </div>
  );
}

export function VitalSigns({ vitals, className, compact = false }: VitalSignsProps) {
  if (!vitals.length) {
    return (
      <div className={cn('text-center text-gray-500 py-8', className)}>
        No vital signs recorded
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {vitals.map((vital) => (
        <VitalSignCard key={vital.code} vital={vital} compact={compact} />
      ))}
    </div>
  );
}

// Common vital sign presets with normal ranges
export const VITAL_SIGN_PRESETS: Record<string, Omit<VitalSign, 'value' | 'recordedAt'>> = {
  systolicBP: {
    code: '8480-6',
    name: 'Systolic BP',
    unit: 'mmHg',
    normalRange: { min: 90, max: 120 },
  },
  diastolicBP: {
    code: '8462-4',
    name: 'Diastolic BP',
    unit: 'mmHg',
    normalRange: { min: 60, max: 80 },
  },
  heartRate: {
    code: '8867-4',
    name: 'Heart Rate',
    unit: 'bpm',
    normalRange: { min: 60, max: 100 },
  },
  respiratoryRate: {
    code: '9279-1',
    name: 'Respiratory Rate',
    unit: '/min',
    normalRange: { min: 12, max: 20 },
  },
  temperature: {
    code: '8310-5',
    name: 'Temperature',
    unit: '\u00B0C',
    normalRange: { min: 36.1, max: 37.2 },
  },
  oxygenSaturation: {
    code: '2708-6',
    name: 'O2 Saturation',
    unit: '%',
    normalRange: { min: 95, max: 100 },
  },
  weight: {
    code: '29463-7',
    name: 'Weight',
    unit: 'kg',
  },
  height: {
    code: '8302-2',
    name: 'Height',
    unit: 'cm',
  },
};
