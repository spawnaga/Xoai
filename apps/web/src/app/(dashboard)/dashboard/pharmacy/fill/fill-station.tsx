'use client';

import { useState, useCallback, useRef } from 'react';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { BarcodeScanner } from '@/components/pharmacy/barcode-scanner';
import { LabelPreview } from '@/components/pharmacy/label-preview';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

interface FillPrescription {
  id: string;
  rxNumber: string;
  patientName: string;
  drugName: string;
  drugStrength: string;
  drugForm: string;
  ndc: string;
  quantity: number;
  daysSupply: number;
  sig: string;
  priority: 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';
  state: 'FILLING';
  waitingMinutes?: number;
  isControlled?: boolean;
  scheduleClass?: string;
}

interface FillStationProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  prescriptions: FillPrescription[];
  userId: string;
}

const priorityConfig = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NORMAL: { label: 'Normal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  LOW: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

export function FillStation({ stats, prescriptions: initialPrescriptions, userId: _userId }: FillStationProps) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [selectedId, setSelectedId] = useState<string | null>(prescriptions[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedNdc, setScannedNdc] = useState<string | null>(null);
  const [ndcVerified, setNdcVerified] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const selectedPrescription = prescriptions.find(p => p.id === selectedId);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  const handleScan = useCallback((barcode: string, type: 'ndc' | 'rxnumber' | 'unknown') => {
    if (!selectedPrescription) return;

    if (type === 'ndc') {
      setScannedNdc(barcode);
      // Verify NDC matches expected
      const expectedNdc = selectedPrescription.ndc.replace(/-/g, '');
      const scannedClean = barcode.replace(/-/g, '');
      setNdcVerified(expectedNdc === scannedClean);
    }
  }, [selectedPrescription]);

  const handlePrintLabel = useCallback(() => {
    // In production, send to label printer
    setShowLabel(true);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!selectedId || !ndcVerified) return;

    // In production, call API to mark as filled
    setPrescriptions(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(prescriptions[1]?.id || null);
    setScannedNdc(null);
    setNdcVerified(false);
    setShowLabel(false);
  }, [selectedId, ndcVerified, prescriptions]);

  const focusScanner = useCallback(() => {
    scannerRef.current?.querySelector('input')?.focus();
  }, []);

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F6',
      handler: focusScanner,
      description: 'Focus barcode scanner',
    },
    {
      key: 'F8',
      handler: handlePrintLabel,
      description: 'Print label',
      disabled: !selectedId,
    },
    {
      key: 'F9',
      handler: handleComplete,
      description: 'Complete fill',
      disabled: !ndcVerified,
    },
    {
      key: 'F5',
      handler: handleRefresh,
      description: 'Refresh queue',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fill Station</h1>
        <p className="mt-1 text-slate-500">
          Scan NDC, fill prescriptions, and print labels
        </p>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="fill"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Fill Queue ({prescriptions.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {prescriptions.map((rx) => {
                const priority = priorityConfig[rx.priority];
                const isSelected = selectedId === rx.id;

                return (
                  <button
                    key={rx.id}
                    onClick={() => {
                      setSelectedId(rx.id);
                      setScannedNdc(null);
                      setNdcVerified(false);
                      setShowLabel(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium text-slate-900">{rx.rxNumber}</span>
                      <div className="flex items-center gap-1">
                        {rx.isControlled && (
                          <span className="px-1 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                            {rx.scheduleClass}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${priority.bgColor} ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{rx.patientName}</p>
                    <p className="text-xs text-slate-500">{rx.drugName} {rx.drugStrength}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fill Workstation */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPrescription ? (
            <>
              {/* Prescription Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedPrescription.rxNumber}</h2>
                    <p className="text-slate-600">{selectedPrescription.patientName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPrescription.isControlled && (
                      <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg">
                        {selectedPrescription.scheduleClass}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${priorityConfig[selectedPrescription.priority].bgColor} ${priorityConfig[selectedPrescription.priority].color}`}>
                      {priorityConfig[selectedPrescription.priority].label}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {selectedPrescription.drugName} {selectedPrescription.drugStrength}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedPrescription.drugForm}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-mono text-slate-700">NDC: {selectedPrescription.ndc}</span>
                    <span>Qty: <strong>{selectedPrescription.quantity}</strong></span>
                    <span>Days: <strong>{selectedPrescription.daysSupply}</strong></span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">Directions</h4>
                  <p className="text-lg font-medium text-slate-900">{selectedPrescription.sig}</p>
                </div>
              </div>

              {/* Barcode Scanner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6" ref={scannerRef}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Scan Product NDC</h3>
                <BarcodeScanner
                  onScan={handleScan}
                  enabled={true}
                  placeholder="Scan or enter NDC barcode (F6 to focus)"
                  autoFocus
                />

                {/* Verification Status */}
                {scannedNdc && (
                  <div className={`mt-4 p-4 rounded-xl ${
                    ndcVerified
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {ndcVerified ? (
                        <>
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-900">NDC Verified</p>
                            <p className="text-sm text-emerald-700">Product matches prescription</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-red-900">NDC Mismatch</p>
                            <p className="text-sm text-red-700">
                              Expected: {selectedPrescription.ndc} | Scanned: {scannedNdc}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Label Preview */}
              {showLabel && (
                <LabelPreview
                  prescription={{
                    rxNumber: selectedPrescription.rxNumber,
                    patientName: selectedPrescription.patientName,
                    drugName: selectedPrescription.drugName,
                    drugStrength: selectedPrescription.drugStrength,
                    drugForm: selectedPrescription.drugForm,
                    quantity: selectedPrescription.quantity,
                    daysSupply: selectedPrescription.daysSupply,
                    sig: selectedPrescription.sig,
                    refillsRemaining: 3,
                    refillsTotal: 5,
                    prescriberName: 'Dr. Sarah Johnson',
                    ndc: selectedPrescription.ndc,
                    isControlled: selectedPrescription.isControlled,
                    scheduleClass: selectedPrescription.scheduleClass,
                    auxiliaryLabels: ['Take with food', 'May cause drowsiness'],
                  }}
                  onPrint={() => console.log('Printing label...')}
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintLabel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Label (F8)
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!ndcVerified}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Fill (F9)
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-lg font-medium text-slate-900">No prescription selected</p>
              <p className="text-sm text-slate-500 mt-1">Select a prescription from the queue</p>
            </div>
          )}
        </div>
      </div>

      <KeyboardShortcuts context="fill" />
    </div>
  );
}
