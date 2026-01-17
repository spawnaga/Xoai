'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'appealing';

interface Claim {
  id: string;
  rxNumber: string;
  patientName: string;
  drugName: string;
  drugStrength: string;
  quantity: number;
  status: ClaimStatus;
  rejectCode?: string;
  rejectMessage?: string;
  submittedAt: string;
  insuranceName: string;
  patientPay: number;
  insurancePay: number;
}

interface ClaimsWorkstationProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  claims: Claim[];
  userId: string;
}

const statusConfig: Record<ClaimStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  approved: { label: 'Approved', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  appealing: { label: 'Appealing', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

// Common NCPDP rejection codes and resolutions
const REJECT_CODE_RESOLUTIONS: Record<string, { title: string; actions: string[] }> = {
  '70': {
    title: 'Product/Service Not Covered',
    actions: [
      'Check formulary alternatives',
      'Request prior authorization',
      'Contact prescriber for therapeutic alternative',
      'Offer cash price',
    ],
  },
  '75': {
    title: 'Prior Authorization Required',
    actions: [
      'Submit prior authorization request',
      'Contact insurance for expedited review',
      'Check if similar medication is covered',
      'Contact prescriber for alternative',
    ],
  },
  '76': {
    title: 'Plan Limitations Exceeded',
    actions: [
      'Check quantity limits',
      'Request override with clinical justification',
      'Split fill if allowed',
      'Contact insurance for exception',
    ],
  },
  '79': {
    title: 'Refill Too Soon',
    actions: [
      'Check expected refill date',
      'Verify days supply of previous fill',
      'Request vacation override if applicable',
      'Contact insurance for early refill exception',
    ],
  },
  '88': {
    title: 'DUR Reject Error',
    actions: [
      'Review DUR reason code',
      'Submit override with reason',
      'Contact prescriber for documentation',
    ],
  },
};

export function ClaimsWorkstation({ stats, claims: initialClaims, userId: _userId }: ClaimsWorkstationProps) {
  const router = useRouter();
  const [claims, setClaims] = useState(initialClaims);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');
  const [overrideCode, setOverrideCode] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  const selectedClaim = claims.find(c => c.id === selectedId);

  const filteredClaims = claims.filter(
    c => statusFilter === 'all' || c.status === statusFilter
  );

  // tRPC mutations
  const utils = trpc.useUtils();

  const resolveMutation = trpc.pharmacyWorkflow.claim.resolve.useMutation({
    onSuccess: () => {
      utils.pharmacyWorkflow.claim.invalidate();
      utils.pharmacyWorkflow.queue.invalidate();
      router.refresh();
    },
  });

  const isLoading = resolveMutation.isPending;

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleResubmit = useCallback(async (id: string) => {
    try {
      await resolveMutation.mutateAsync({
        claimId: id,
        action: 'resubmit',
      });
      setClaims(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'pending' as ClaimStatus } : c
      ));
    } catch (error) {
      console.error('Failed to resubmit claim:', error);
    }
  }, [resolveMutation]);

  const handleConvertToCash = useCallback(async (id: string) => {
    try {
      await resolveMutation.mutateAsync({
        claimId: id,
        action: 'cash',
      });
      setClaims(prev => prev.filter(c => c.id !== id));
      setSelectedId(null);
    } catch (error) {
      console.error('Failed to convert to cash:', error);
    }
  }, [resolveMutation]);

  // Submit with override code - used for DUR/plan limit overrides
  const handleSubmitWithOverride = useCallback(async (id: string, code: string) => {
    if (!code.trim()) return;
    try {
      await resolveMutation.mutateAsync({
        claimId: id,
        action: 'override',
        overrideCode: code,
        overrideReason: 'Override requested by pharmacist',
      });
      setClaims(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'pending' as ClaimStatus } : c
      ));
      setOverrideCode('');
      setShowOverrideInput(false);
    } catch (error) {
      console.error('Failed to submit with override:', error);
    }
  }, [resolveMutation]);

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F5',
      handler: () => selectedId && handleResubmit(selectedId),
      description: 'Resubmit claim',
      disabled: !selectedId || selectedClaim?.status !== 'rejected',
    },
    {
      key: 'F10',
      handler: handleRefresh,
      description: 'Refresh claims',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Claims Processing</h1>
        <p className="mt-1 text-slate-500">
          Manage insurance claims and resolve rejections
        </p>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="insurance"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        {[
          { value: 'all', label: 'All', count: claims.length },
          { value: 'pending', label: 'Pending', count: pendingCount },
          { value: 'approved', label: 'Approved', count: approvedCount },
          { value: 'rejected', label: 'Rejected', count: rejectedCount },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value as ClaimStatus | 'all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab.value
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims List */}
        <div className="lg:col-span-2">
          {filteredClaims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-900">No claims found</p>
              <p className="text-sm text-slate-500 mt-1">
                {statusFilter !== 'all' ? `No ${statusFilter} claims` : 'All claims have been processed'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rx #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Patient / Drug</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Insurance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Copay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.map((claim) => {
                    const status = statusConfig[claim.status];
                    const isSelected = selectedId === claim.id;

                    return (
                      <tr
                        key={claim.id}
                        onClick={() => setSelectedId(claim.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {claim.rxNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{claim.patientName}</p>
                          <p className="text-xs text-slate-500">
                            {claim.drugName} {claim.drugStrength}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{claim.insuranceName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${status.bgColor} ${status.color}`}>
                            {claim.status === 'rejected' && claim.rejectCode && (
                              <span className="font-mono">[{claim.rejectCode}]</span>
                            )}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {claim.status === 'approved' ? (
                            <span className="text-sm font-medium text-slate-900">
                              ${claim.patientPay.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedClaim ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Claim Details</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Rx Info */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Prescription</p>
                  <p className="font-mono font-bold">{selectedClaim.rxNumber}</p>
                </div>

                {/* Patient */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Patient</p>
                  <p className="font-medium text-slate-900">{selectedClaim.patientName}</p>
                </div>

                {/* Drug */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Medication</p>
                  <p className="font-medium text-slate-900">
                    {selectedClaim.drugName} {selectedClaim.drugStrength}
                  </p>
                  <p className="text-sm text-slate-600">Qty: {selectedClaim.quantity}</p>
                </div>

                {/* Insurance */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Insurance</p>
                  <p className="font-medium text-slate-900">{selectedClaim.insuranceName}</p>
                </div>

                {/* Status-specific content */}
                {selectedClaim.status === 'rejected' && selectedClaim.rejectCode && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-bold text-red-700">
                        [{selectedClaim.rejectCode}]
                      </span>
                      <span className="text-sm font-medium text-red-900">
                        {selectedClaim.rejectMessage}
                      </span>
                    </div>

                    {REJECT_CODE_RESOLUTIONS[selectedClaim.rejectCode] && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-red-700 mb-2">Resolution Options:</p>
                        <ul className="space-y-1">
                          {REJECT_CODE_RESOLUTIONS[selectedClaim.rejectCode]?.actions.map((action, i) => (
                            <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedClaim.status === 'approved' && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-emerald-600 mb-1">Patient Copay</p>
                        <p className="text-lg font-bold text-emerald-900">
                          ${selectedClaim.patientPay.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 mb-1">Insurance Pays</p>
                        <p className="text-lg font-bold text-emerald-900">
                          ${selectedClaim.insurancePay.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-2 border-t border-slate-100">
                  {selectedClaim.status === 'rejected' && (
                    <>
                      <button
                        onClick={() => handleResubmit(selectedClaim.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Resubmit (F5)
                      </button>

                      {/* Override submission for DUR/plan limit rejections */}
                      {(selectedClaim.rejectCode === '88' || selectedClaim.rejectCode === '76') && (
                        showOverrideInput ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={overrideCode}
                              onChange={(e) => setOverrideCode(e.target.value)}
                              placeholder="Enter override code..."
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowOverrideInput(false);
                                  setOverrideCode('');
                                }}
                                className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitWithOverride(selectedClaim.id, overrideCode)}
                                disabled={!overrideCode.trim()}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowOverrideInput(true)}
                            className="w-full px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-xl hover:bg-purple-200 transition-colors"
                          >
                            Submit with Override Code
                          </button>
                        )
                      )}

                      <button
                        onClick={() => handleConvertToCash(selectedClaim.id)}
                        className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Convert to Cash
                      </button>
                    </>
                  )}

                  {selectedClaim.status === 'approved' && (
                    <button
                      className="w-full px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-xl hover:bg-emerald-200 transition-colors"
                    >
                      Proceed to Fill
                    </button>
                  )}

                  {selectedClaim.status === 'pending' && (
                    <p className="text-xs text-slate-500 text-center">
                      Waiting for insurance response...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No claim selected</p>
              <p className="text-xs text-slate-500 mt-1">Click a claim to view details</p>
            </div>
          )}
        </div>
      </div>

      <KeyboardShortcuts context="claim" />
    </div>
  );
}
