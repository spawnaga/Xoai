'use client';

import { useState } from 'react';

export type DurAlertSeverity = 'high' | 'moderate' | 'low' | 'info';
export type DurAlertType =
  | 'drug-drug'
  | 'drug-allergy'
  | 'drug-disease'
  | 'duplicate-therapy'
  | 'dosage'
  | 'pregnancy'
  | 'age'
  | 'refill-too-soon'
  | 'quantity-limit'
  | 'other';

export interface DurAlert {
  id: string;
  type: DurAlertType;
  severity: DurAlertSeverity;
  title: string;
  description: string;
  drugName?: string;
  interactingDrug?: string;
  recommendation?: string;
  overrideRequired: boolean;
  clinicalSignificance?: string;
}

export interface DurOverride {
  alertId: string;
  code: string;
  reason: string;
  pharmacistNotes?: string;
}

interface DurAlertModalProps {
  alerts: DurAlert[];
  onOverride: (overrides: DurOverride[]) => void;
  onCancel: () => void;
  isOpen: boolean;
  prescriptionInfo?: {
    rxNumber: string;
    patientName: string;
    drugName: string;
  };
}

const DUR_OVERRIDE_CODES = [
  { code: 'A1', label: 'Prescriber Consulted' },
  { code: 'A2', label: 'Patient Informed' },
  { code: 'A3', label: 'Patient Refused Counseling' },
  { code: 'M0', label: 'Dispensed As Written' },
  { code: 'MO', label: 'Patient Requested Brand' },
  { code: 'PA', label: 'Prior Auth on File' },
  { code: 'PH', label: 'Physician Authorization' },
  { code: 'PS', label: 'Patient Safety Concern' },
  { code: 'PT', label: 'Patient Therapy Assessment' },
  { code: 'TN', label: 'Therapy Change' },
];

const severityConfig: Record<DurAlertSeverity, { color: string; bgColor: string; icon: React.ReactNode }> = {
  high: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  moderate: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  low: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

const alertTypeLabels: Record<DurAlertType, string> = {
  'drug-drug': 'Drug-Drug Interaction',
  'drug-allergy': 'Drug-Allergy Interaction',
  'drug-disease': 'Drug-Disease Interaction',
  'duplicate-therapy': 'Duplicate Therapy',
  dosage: 'Dosage Alert',
  pregnancy: 'Pregnancy Warning',
  age: 'Age-Related Warning',
  'refill-too-soon': 'Refill Too Soon',
  'quantity-limit': 'Quantity Limit Exceeded',
  other: 'Other Alert',
};

export function DurAlertModal({
  alerts,
  onOverride,
  onCancel,
  isOpen,
  prescriptionInfo,
}: DurAlertModalProps) {
  const [overrides, setOverrides] = useState<Record<string, { code: string; reason: string; notes: string }>>({});
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleCodeChange = (alertId: string, code: string) => {
    setOverrides(prev => ({
      ...prev,
      [alertId]: {
        ...prev[alertId],
        code,
        reason: DUR_OVERRIDE_CODES.find(c => c.code === code)?.label || '',
        notes: prev[alertId]?.notes || '',
      },
    }));
  };

  const handleNotesChange = (alertId: string, notes: string) => {
    setOverrides(prev => ({
      ...prev,
      [alertId]: {
        ...prev[alertId],
        notes,
      },
    }));
  };

  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const requiresOverride = alerts.filter(a => a.overrideRequired);
  const allOverridesProvided = requiresOverride.every(
    alert => overrides[alert.id]?.code && overrides[alert.id]?.code.length > 0
  );

  const handleSubmit = () => {
    const durOverrides: DurOverride[] = alerts
      .filter(alert => overrides[alert.id]?.code)
      .map(alert => ({
        alertId: alert.id,
        code: overrides[alert.id].code,
        reason: overrides[alert.id].reason,
        pharmacistNotes: overrides[alert.id].notes || undefined,
      }));

    onOverride(durOverrides);
  };

  const highSeverityCount = alerts.filter(a => a.severity === 'high').length;
  const moderateSeverityCount = alerts.filter(a => a.severity === 'moderate').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  DUR Alerts ({alerts.length})
                </h2>
                {prescriptionInfo && (
                  <p className="mt-1 text-sm text-slate-500">
                    Rx #{prescriptionInfo.rxNumber} • {prescriptionInfo.patientName} • {prescriptionInfo.drugName}
                  </p>
                )}
              </div>
              <button
                onClick={onCancel}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 mt-3">
              {highSeverityCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  {highSeverityCount} High
                </span>
              )}
              {moderateSeverityCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  {moderateSeverityCount} Moderate
                </span>
              )}
              {requiresOverride.length > 0 && (
                <span className="text-xs text-slate-500">
                  {requiresOverride.length} override(s) required
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {alerts.map((alert) => {
              const severity = severityConfig[alert.severity];
              const isExpanded = expandedAlerts.has(alert.id);

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border ${severity.bgColor} border-opacity-50 overflow-hidden`}
                >
                  {/* Alert header */}
                  <button
                    onClick={() => toggleExpanded(alert.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    <div className={`p-1 rounded-lg ${severity.bgColor} ${severity.color}`}>
                      {severity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${severity.color} uppercase`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alertTypeLabels[alert.type]}
                        </span>
                        {alert.overrideRequired && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            Override Required
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                      <p className="text-sm text-slate-600 mt-0.5">{alert.description}</p>
                    </div>
                    <svg
                      className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {alert.recommendation && (
                        <div className="bg-white/50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-slate-700 mb-1">Recommendation</h4>
                          <p className="text-sm text-slate-600">{alert.recommendation}</p>
                        </div>
                      )}

                      {alert.clinicalSignificance && (
                        <div className="bg-white/50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-slate-700 mb-1">Clinical Significance</h4>
                          <p className="text-sm text-slate-600">{alert.clinicalSignificance}</p>
                        </div>
                      )}

                      {/* Override section */}
                      {alert.overrideRequired && (
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <h4 className="text-xs font-semibold text-slate-700 mb-2">Override (Required)</h4>
                          <div className="space-y-2">
                            <select
                              value={overrides[alert.id]?.code || ''}
                              onChange={(e) => handleCodeChange(alert.id, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            >
                              <option value="">Select override code...</option>
                              {DUR_OVERRIDE_CODES.map((code) => (
                                <option key={code.code} value={code.code}>
                                  {code.code} - {code.label}
                                </option>
                              ))}
                            </select>
                            <textarea
                              value={overrides[alert.id]?.notes || ''}
                              onChange={(e) => handleNotesChange(alert.id, e.target.value)}
                              placeholder="Additional pharmacist notes (optional)..."
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Pharmacist review required. Press F4 to override.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allOverridesProvided}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
              >
                Override & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
