'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

type IntakeSource = 'eRx' | 'fax' | 'phone' | 'walkin';

interface IntakePrescription {
  id: string;
  rxNumber: string;
  patientName: string;
  patientDob?: string;
  drugName: string;
  drugStrength?: string;
  quantity: number;
  daysSupply?: number;
  priority: 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';
  state: 'INTAKE';
  waitingMinutes?: number;
  isControlled?: boolean;
  source: IntakeSource;
  prescriberName?: string;
}

interface IntakeQueueProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  prescriptions: IntakePrescription[];
  userId: string;
}

const sourceConfig: Record<IntakeSource, { label: string; color: string; bgColor: string }> = {
  eRx: { label: 'e-Rx', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  fax: { label: 'Fax', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  phone: { label: 'Phone', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  walkin: { label: 'Walk-in', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

const priorityConfig = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NORMAL: { label: 'Normal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  LOW: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

export function IntakeQueue({ stats, prescriptions: initialPrescriptions, userId }: IntakeQueueProps) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<IntakeSource | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const selectedPrescription = prescriptions.find(p => p.id === selectedId);

  const filteredPrescriptions = prescriptions.filter(
    p => sourceFilter === 'all' || p.source === sourceFilter
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  const handleAccept = useCallback(async (id: string) => {
    // In production, call API to accept and move to data entry
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    setSelectedId(null);
  }, []);

  const handleReject = useCallback(async (id: string) => {
    // In production, call API to reject/cancel
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    setSelectedId(null);
  }, []);

  const handleNext = useCallback(() => {
    const currentIndex = filteredPrescriptions.findIndex(p => p.id === selectedId);
    const nextIndex = (currentIndex + 1) % filteredPrescriptions.length;
    setSelectedId(filteredPrescriptions[nextIndex]?.id || null);
  }, [filteredPrescriptions, selectedId]);

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F2',
      handler: () => selectedId && handleAccept(selectedId),
      description: 'Accept prescription',
      disabled: !selectedId,
    },
    {
      key: 'F3',
      handler: handleNext,
      description: 'Next prescription',
      disabled: filteredPrescriptions.length === 0,
    },
    {
      key: 'F5',
      handler: handleRefresh,
      description: 'Refresh queue',
    },
    {
      key: 'Escape',
      handler: () => setSelectedId(null),
      description: 'Deselect',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Intake</h1>
          <p className="mt-1 text-slate-500">
            Review and accept incoming prescriptions
          </p>
        </div>
        <Link
          href="/dashboard/pharmacy/intake/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Manual Entry
        </Link>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="intake"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Source Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Source:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              sourceFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({prescriptions.length})
          </button>
          {(Object.keys(sourceConfig) as IntakeSource[]).map((source) => {
            const config = sourceConfig[source];
            const count = prescriptions.filter(p => p.source === source).length;
            return (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  sourceFilter === source
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prescription List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-900">All caught up!</p>
              <p className="text-sm text-slate-500 mt-1">No prescriptions waiting in the intake queue</p>
            </div>
          ) : (
            filteredPrescriptions.map((rx) => {
              const source = sourceConfig[rx.source];
              const priority = priorityConfig[rx.priority];
              const isSelected = selectedId === rx.id;

              return (
                <button
                  key={rx.id}
                  onClick={() => setSelectedId(rx.id)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Source indicator */}
                    <div className={`px-2 py-1 rounded-lg ${source.bgColor} ${source.color} text-xs font-semibold`}>
                      {source.label}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-900">{rx.rxNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                          {priority.label}
                        </span>
                        {rx.isControlled && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            C-II
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {rx.drugName} {rx.drugStrength}
                      </p>
                      <p className="text-xs text-slate-500">
                        {rx.patientName} • Qty: {rx.quantity}
                        {rx.prescriberName && ` • ${rx.prescriberName}`}
                      </p>
                    </div>

                    {/* Wait time */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {rx.waitingMinutes ? `${rx.waitingMinutes}m` : '--'}
                      </p>
                      <p className="text-xs text-slate-500">waiting</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedPrescription ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Prescription Details</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Rx Info */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Rx Number</p>
                  <p className="font-mono font-bold text-lg">{selectedPrescription.rxNumber}</p>
                </div>

                {/* Patient */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Patient</p>
                  <p className="font-medium text-slate-900">{selectedPrescription.patientName}</p>
                  {selectedPrescription.patientDob && (
                    <p className="text-sm text-slate-600">DOB: {selectedPrescription.patientDob}</p>
                  )}
                </div>

                {/* Drug */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Medication</p>
                  <p className="font-medium text-slate-900">
                    {selectedPrescription.drugName} {selectedPrescription.drugStrength}
                  </p>
                  <p className="text-sm text-slate-600">
                    Qty: {selectedPrescription.quantity}
                    {selectedPrescription.daysSupply && ` • ${selectedPrescription.daysSupply} days`}
                  </p>
                </div>

                {/* Prescriber */}
                {selectedPrescription.prescriberName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Prescriber</p>
                    <p className="font-medium text-slate-900">{selectedPrescription.prescriberName}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-2 border-t border-slate-100">
                  <button
                    onClick={() => handleAccept(selectedPrescription.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept (F2)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleReject(selectedPrescription.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Next (F3)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No prescription selected</p>
              <p className="text-xs text-slate-500 mt-1">Click a prescription to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts context="intake" />
    </div>
  );
}
