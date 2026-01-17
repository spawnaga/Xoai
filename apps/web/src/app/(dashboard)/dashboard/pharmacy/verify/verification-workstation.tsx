'use client';

import { useState, useCallback } from 'react';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { BarcodeScanner } from '@/components/pharmacy/barcode-scanner';
import { DurAlertModal, type DurAlert, type DurOverride } from '@/components/pharmacy/dur-alert-modal';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

interface VerifyPrescription {
  id: string;
  rxNumber: string;
  patientName: string;
  patientDob?: string;
  drugName: string;
  drugStrength: string;
  drugForm: string;
  ndc: string;
  quantity: number;
  daysSupply: number;
  sig: string;
  priority: 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';
  state: 'VERIFICATION';
  waitingMinutes?: number;
  isControlled?: boolean;
  scheduleClass?: string;
  filledBy: string;
  durAlerts: DurAlert[];
}

interface VerificationWorkstationProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  prescriptions: VerifyPrescription[];
  userId: string;
  isPharmacist: boolean;
}

const priorityConfig = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NORMAL: { label: 'Normal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  LOW: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

const VERIFICATION_CHECKLIST = [
  { id: 'patient', label: 'Patient name and DOB verified' },
  { id: 'drug', label: 'Drug name, strength, and form correct' },
  { id: 'quantity', label: 'Quantity and days supply appropriate' },
  { id: 'directions', label: 'Directions clear and appropriate' },
  { id: 'ndc', label: 'NDC matches label' },
  { id: 'appearance', label: 'Product appearance acceptable' },
  { id: 'label', label: 'Label affixed correctly' },
];

export function VerificationWorkstation({ stats, prescriptions: initialPrescriptions, userId: _userId, isPharmacist }: VerificationWorkstationProps) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [selectedId, setSelectedId] = useState<string | null>(prescriptions[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showDurModal, setShowDurModal] = useState(false);
  const [scannedNdc, setScannedNdc] = useState<string | null>(null);
  const [ndcVerified, setNdcVerified] = useState(false);

  const selectedPrescription = prescriptions.find(p => p.id === selectedId);

  const allChecked = VERIFICATION_CHECKLIST.every(item => checklist[item.id]);
  const hasDurAlerts = selectedPrescription?.durAlerts && selectedPrescription.durAlerts.length > 0;

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  const handleScan = useCallback((barcode: string, type: 'ndc' | 'rxnumber' | 'unknown') => {
    if (!selectedPrescription) return;

    if (type === 'ndc') {
      setScannedNdc(barcode);
      const expectedNdc = selectedPrescription.ndc.replace(/-/g, '');
      const scannedClean = barcode.replace(/-/g, '');
      setNdcVerified(expectedNdc === scannedClean);
      if (expectedNdc === scannedClean) {
        setChecklist(prev => ({ ...prev, ndc: true }));
      }
    }
  }, [selectedPrescription]);

  const handleApprove = useCallback(async () => {
    if (!selectedId || !allChecked || !ndcVerified) return;

    // Check for DUR alerts
    if (hasDurAlerts) {
      setShowDurModal(true);
      return;
    }

    // In production, call API to approve
    completeApproval();
  }, [selectedId, allChecked, ndcVerified, hasDurAlerts]);

  const handleDurOverride = useCallback((overrides: DurOverride[]) => {
    // In production, save overrides to database
    console.log('DUR Overrides:', overrides);
    setShowDurModal(false);
    completeApproval();
  }, []);

  const completeApproval = () => {
    setPrescriptions(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(prescriptions[1]?.id || null);
    setChecklist({});
    setScannedNdc(null);
    setNdcVerified(false);
  };

  const handleReject = useCallback(async () => {
    if (!selectedId) return;

    // In production, call API to reject and return to fill
    setPrescriptions(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(prescriptions[1]?.id || null);
    setChecklist({});
    setScannedNdc(null);
    setNdcVerified(false);
  }, [selectedId, prescriptions]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F2',
      handler: handleApprove,
      description: 'Approve prescription',
      disabled: !allChecked || !ndcVerified,
    },
    {
      key: 'F4',
      handler: () => hasDurAlerts && setShowDurModal(true),
      description: 'Override DUR',
      disabled: !hasDurAlerts,
      requiresPharmacist: true,
    },
    {
      key: 'F6',
      handler: () => {},
      description: 'Scan barcode',
    },
    {
      key: 'F5',
      handler: handleRefresh,
      description: 'Refresh queue',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true, isPharmacist });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pharmacist Verification</h1>
        <p className="mt-1 text-slate-500">
          Review filled prescriptions and verify accuracy
        </p>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="verify"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                Verify Queue ({prescriptions.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {prescriptions.map((rx) => {
                const priority = priorityConfig[rx.priority];
                const isSelected = selectedId === rx.id;
                const hasAlerts = rx.durAlerts.length > 0;

                return (
                  <button
                    key={rx.id}
                    onClick={() => {
                      setSelectedId(rx.id);
                      setChecklist({});
                      setScannedNdc(null);
                      setNdcVerified(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium text-slate-900">{rx.rxNumber}</span>
                      <div className="flex items-center gap-1">
                        {hasAlerts && (
                          <span className="px-1 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded flex items-center gap-0.5">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            DUR
                          </span>
                        )}
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
                    <p className="text-[10px] text-slate-400 mt-1">Filled by: {rx.filledBy}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Verification Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPrescription ? (
            <>
              {/* DUR Alerts Banner */}
              {hasDurAlerts && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900">
                        {selectedPrescription.durAlerts.length} DUR Alert(s) Require Review
                      </p>
                      <p className="text-sm text-amber-700">
                        Override required before approval
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDurModal(true)}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                    >
                      Review DUR (F4)
                    </button>
                  </div>
                </div>
              )}

              {/* Prescription Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedPrescription.rxNumber}</h2>
                    <p className="text-slate-600">
                      {selectedPrescription.patientName}
                      {selectedPrescription.patientDob && ` • DOB: ${selectedPrescription.patientDob}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Filled by</p>
                    <p className="font-medium text-slate-900">{selectedPrescription.filledBy}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
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

                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-1">Directions</h4>
                  <p className="text-lg font-medium text-slate-900">{selectedPrescription.sig}</p>
                </div>
              </div>

              {/* Barcode Verification */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Scan Product NDC</h3>
                <BarcodeScanner
                  onScan={handleScan}
                  enabled={true}
                  placeholder="Scan to verify product NDC"
                />

                {scannedNdc && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    ndcVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {ndcVerified ? (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">NDC Verified</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="font-medium">NDC Mismatch - Check product</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Verification Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Verification Checklist</h3>
                <div className="space-y-3">
                  {VERIFICATION_CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.id] || false}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm ${checklist[item.id] ? 'text-slate-900' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReject}
                  className="px-6 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!allChecked || !ndcVerified}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve (F2)
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

      {/* DUR Alert Modal */}
      {selectedPrescription && (
        <DurAlertModal
          isOpen={showDurModal}
          alerts={selectedPrescription.durAlerts}
          onOverride={handleDurOverride}
          onCancel={() => setShowDurModal(false)}
          prescriptionInfo={{
            rxNumber: selectedPrescription.rxNumber,
            patientName: selectedPrescription.patientName,
            drugName: `${selectedPrescription.drugName} ${selectedPrescription.drugStrength}`,
          }}
        />
      )}

      <KeyboardShortcuts context="verify" isPharmacist={isPharmacist} />
    </div>
  );
}
