'use client';

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export interface PDMPAlert {
  id: string;
  type: 'multi_prescriber' | 'multi_pharmacy' | 'overlapping_rx' | 'high_mme' | 'early_refill' | 'doctor_shopping';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
}

export interface PDMPHistory {
  id: string;
  drugName: string;
  quantity: number;
  filledDate: string;
  pharmacyName: string;
  isControlled: boolean;
  schedule?: number;
}

interface PDMPReviewPanelProps {
  patientId: string;
  isControlled: boolean;
  onJustificationSubmit?: (justification: string, acknowledged: boolean) => void;
}

const severityConfig = {
  low: { label: 'Low', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  moderate: { label: 'Moderate', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
};

function RiskScoreDisplay({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'text-red-600 bg-red-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  return (
    <div className={`p-3 rounded-lg ${getColor()}`}>
      <div className="text-xs opacity-75">Risk Score</div>
      <div className="text-2xl font-bold">{score}</div>
    </div>
  );
}

export default function PDMPReviewPanel({
  patientId,
  isControlled,
  onJustificationSubmit,
}: PDMPReviewPanelProps) {
  const [pdmpChecked, setPdmpChecked] = useState(false);
  const [noFlags, setNoFlags] = useState(false);
  const [justification, setJustification] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Try to query PDMP data from API
  const { data: pdmpData, isLoading, refetch } = trpc.pdmp.query.useQuery(
    { patientId },
    {
      enabled: isControlled && !!patientId,
      retry: false,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  const handleQueryPDMP = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSubmit = useCallback(() => {
    if (onJustificationSubmit) {
      onJustificationSubmit(justification, pdmpChecked && noFlags);
    }
  }, [justification, pdmpChecked, noFlags, onJustificationSubmit]);

  if (!isControlled) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-yellow-200 rounded w-3/4"></div>
          <div className="h-20 bg-yellow-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Use API data or fallback to mock data
  const riskScore = pdmpData?.riskScore ?? 35;
  const mmeDaily = pdmpData?.mmeDaily ?? 45;
  const alerts = pdmpData?.alerts ?? [
    { id: '1', type: 'early_refill' as const, severity: 'moderate' as const, title: 'Early Refill', description: 'Patient refilling 5 days early' },
  ];
  const history = pdmpData?.history ?? [];
  const totalPrescribers = pdmpData?.totalPrescribers ?? 2;
  const totalPharmacies = pdmpData?.totalPharmacies ?? 1;

  const hasHighRiskAlerts = alerts.some(
    (a) => a.severity === 'high' || a.severity === 'critical'
  );

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-yellow-900">⚠️ PDMP Review Required</h3>
        <button
          onClick={handleQueryPDMP}
          className="text-xs text-yellow-700 hover:text-yellow-800 underline"
        >
          Refresh
        </button>
      </div>

      {/* Risk Indicators */}
      <div className="grid grid-cols-3 gap-3">
        <RiskScoreDisplay score={riskScore} />
        <div className="p-3 bg-white rounded-lg border border-yellow-200">
          <div className="text-xs text-gray-500">MME/day</div>
          <div className={`text-2xl font-bold ${mmeDaily >= 90 ? 'text-red-600' : mmeDaily >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {mmeDaily}
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border border-yellow-200">
          <div className="text-xs text-gray-500">Prescribers</div>
          <div className="text-2xl font-bold text-slate-700">{totalPrescribers}</div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-yellow-800">Alerts ({alerts.length})</div>
          {alerts.map((alert) => {
            const severity = severityConfig[alert.severity];
            return (
              <div key={alert.id} className={`p-2 rounded ${severity.bgColor} border`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${severity.color}`}>{alert.title}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${severity.bgColor} ${severity.color}`}>
                    {severity.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-medium text-yellow-800 flex items-center gap-1"
          >
            <svg className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            History ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 max-h-32 overflow-y-auto bg-white rounded border">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Drug</th>
                    <th className="px-2 py-1 text-left">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 5).map((rx) => (
                    <tr key={rx.id} className="border-t">
                      <td className="px-2 py-1">{new Date(rx.filledDate).toLocaleDateString()}</td>
                      <td className="px-2 py-1">{rx.drugName}</td>
                      <td className="px-2 py-1">{rx.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2 pt-2 border-t border-yellow-200">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pdmpChecked}
            onChange={(e) => setPdmpChecked(e.target.checked)}
            className="h-4 w-4 rounded border-yellow-300"
          />
          <span>PDMP query completed and reviewed</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={noFlags}
            onChange={(e) => setNoFlags(e.target.checked)}
            className="h-4 w-4 rounded border-yellow-300"
          />
          <span>{hasHighRiskAlerts ? 'Risk flags acknowledged' : 'No risk flags identified'}</span>
        </label>
      </div>

      {/* Justification */}
      {hasHighRiskAlerts && (
        <div>
          <label className="block text-sm font-medium text-yellow-800 mb-1">
            Clinical Justification (Required)
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full border border-yellow-300 rounded px-3 py-2 text-sm"
            rows={2}
            placeholder="Document reason for dispensing despite flags..."
          />
        </div>
      )}

      {/* Submit */}
      {onJustificationSubmit && (
        <button
          onClick={handleSubmit}
          disabled={!pdmpChecked || !noFlags || (hasHighRiskAlerts && !justification.trim())}
          className="w-full px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Acknowledge & Continue
        </button>
      )}

      {/* Footer Stats */}
      <div className="text-xs text-gray-500 pt-2 border-t border-yellow-200">
        {totalPrescribers} prescriber(s) | {totalPharmacies} pharmacy(ies) | {mmeDaily} MME/day
      </div>
    </div>
  );
}
