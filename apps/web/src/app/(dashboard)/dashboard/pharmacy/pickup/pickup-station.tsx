'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { PatientSearch, type PatientResult } from '@/components/pharmacy/patient-search';
import { SignaturePad } from '@/components/pharmacy/signature-pad';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

interface PickupPrescription {
  id: string;
  rxNumber: string;
  patientName: string;
  patientDob: string;
  drugName: string;
  drugStrength: string;
  quantity: number;
  copay: number;
  binLocation: string;
  isControlled?: boolean;
  scheduleClass?: string;
  readyTime: string;
}

interface PickupStationProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  prescriptions: PickupPrescription[];
  userId: string;
}

type PickupStep = 'search' | 'verify' | 'signature' | 'complete';

export function PickupStation({ stats, prescriptions: allPrescriptions, userId: _userId }: PickupStationProps) {
  const router = useRouter();
  const [step, setStep] = useState<PickupStep>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<PickupPrescription[]>([]);
  const [selectedRxIds, setSelectedRxIds] = useState<Set<string>>(new Set());
  const [idVerified, setIdVerified] = useState(false);
  const [counselingOffered, setCounselingOffered] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // tRPC mutations
  const utils = trpc.useUtils();

  const startPickupMutation = trpc.pharmacyWorkflow.dispense.startPickup.useMutation();

  const completeMutation = trpc.pharmacyWorkflow.dispense.complete.useMutation({
    onSuccess: () => {
      utils.pharmacyWorkflow.dispense.invalidate();
      utils.pharmacyWorkflow.queue.invalidate();
      router.refresh();
    },
  });

  const isLoading = startPickupMutation.isPending || completeMutation.isPending;

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handlePatientSelect = async (patient: PatientResult) => {
    setSelectedPatient(patient);
    // Find prescriptions for this patient
    const patientRxs = allPrescriptions.filter(
      rx => rx.patientName.toLowerCase().includes(patient.lastName.toLowerCase())
    );
    setPatientPrescriptions(patientRxs);
    setSelectedRxIds(new Set(patientRxs.map(rx => rx.id)));

    // Start pickup session via API
    try {
      await startPickupMutation.mutateAsync({
        patientId: patient.id,
        prescriptionIds: patientRxs.map(rx => rx.id),
      });
    } catch (error) {
      console.error('Failed to start pickup session:', error);
    }

    setStep('verify');
  };

  const handleVerifyId = () => {
    setIdVerified(true);
  };

  const handleProceedToSignature = () => {
    if (!idVerified) return;
    setStep('signature');
  };

  const handleCaptureSignature = (data: string) => {
    setSignatureData(data);
  };

  const handleComplete = useCallback(async () => {
    if (!signatureData || selectedRxIds.size === 0 || !selectedPatient) return;

    try {
      await completeMutation.mutateAsync({
        patientId: selectedPatient.id,
        prescriptionIds: Array.from(selectedRxIds),
        signatureData,
        counselingOffered,
        idVerified: true,
      });

      setStep('complete');
    } catch (error) {
      console.error('Failed to complete pickup:', error);
    }
  }, [signatureData, selectedRxIds, selectedPatient, counselingOffered, completeMutation]);

  const handleReset = () => {
    setStep('search');
    setSelectedPatient(null);
    setPatientPrescriptions([]);
    setSelectedRxIds(new Set());
    setIdVerified(false);
    setCounselingOffered(false);
    setSignatureData(null);
  };

  const toggleRxSelection = (rxId: string) => {
    setSelectedRxIds(prev => {
      const next = new Set(prev);
      if (next.has(rxId)) {
        next.delete(rxId);
      } else {
        next.add(rxId);
      }
      return next;
    });
  };

  const totalCopay = patientPrescriptions
    .filter(rx => selectedRxIds.has(rx.id))
    .reduce((sum, rx) => sum + rx.copay, 0);

  const hasControlled = patientPrescriptions.some(rx => selectedRxIds.has(rx.id) && rx.isControlled);

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F7',
      handler: () => {},
      description: 'Capture signature',
      disabled: step !== 'signature',
    },
    {
      key: 'F9',
      handler: handleComplete,
      description: 'Complete pickup',
      disabled: step !== 'signature' || !signatureData,
    },
    {
      key: 'F5',
      handler: handleRefresh,
      description: 'Refresh',
    },
    {
      key: 'Escape',
      handler: handleReset,
      description: 'Start over',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pickup & Dispense</h1>
        <p className="mt-1 text-slate-500">
          Patient prescription pickup and dispensing
        </p>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="ready"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {(['search', 'verify', 'signature', 'complete'] as PickupStep[]).map((s, index) => {
          const isActive = s === step;
          const isComplete = ['search', 'verify', 'signature', 'complete'].indexOf(step) > index;
          const labels = {
            search: 'Find Patient',
            verify: 'Verify ID',
            signature: 'Signature',
            complete: 'Complete',
          };

          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isComplete ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}
              `}>
                {isComplete ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {labels[s]}
              </span>
              {index < 3 && (
                <div className={`w-8 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {/* Step 1: Patient Search */}
        {step === 'search' && (
          <div className="max-w-md mx-auto py-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">
              Find Patient
            </h2>
            <PatientSearch
              onSelect={handlePatientSelect}
              placeholder="Search by name, DOB, or phone..."
              autoFocus
            />
            <p className="text-xs text-slate-500 text-center mt-4">
              Enter patient name, date of birth, or phone number to find their prescriptions
            </p>
          </div>
        )}

        {/* Step 2: Verify Patient & Select Prescriptions */}
        {step === 'verify' && selectedPatient && (
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <p className="text-sm text-slate-600">
                  DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                  {selectedPatient.phone && ` • ${selectedPatient.phone}`}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Change Patient
              </button>
            </div>

            {/* ID Verification */}
            <div className={`p-4 rounded-xl border-2 ${idVerified ? 'border-emerald-500 bg-emerald-50' : 'border-amber-500 bg-amber-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {idVerified ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className={`font-semibold ${idVerified ? 'text-emerald-900' : 'text-amber-900'}`}>
                      {idVerified ? 'ID Verified' : 'Verify Patient ID'}
                    </p>
                    <p className={`text-sm ${idVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {idVerified
                        ? 'Patient identity confirmed'
                        : hasControlled
                          ? 'ID required for controlled substance'
                          : 'Check photo ID matches patient'
                      }
                    </p>
                  </div>
                </div>
                {!idVerified && (
                  <button
                    onClick={handleVerifyId}
                    className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Verify ID
                  </button>
                )}
              </div>
            </div>

            {/* Prescriptions */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Ready Prescriptions ({patientPrescriptions.length})
              </h4>
              <div className="space-y-2">
                {patientPrescriptions.map((rx) => (
                  <label
                    key={rx.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedRxIds.has(rx.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRxIds.has(rx.id)}
                      onChange={() => toggleRxSelection(rx.id)}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-slate-900">{rx.rxNumber}</span>
                        {rx.isControlled && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                            {rx.scheduleClass}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{rx.drugName} {rx.drugStrength}</p>
                      <p className="text-xs text-slate-500">Qty: {rx.quantity} • Bin: {rx.binLocation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">${rx.copay.toFixed(2)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Total & Continue */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-500">Total Copay</p>
                <p className="text-2xl font-bold text-slate-900">${totalCopay.toFixed(2)}</p>
              </div>
              <button
                onClick={handleProceedToSignature}
                disabled={!idVerified || selectedRxIds.size === 0}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
              >
                Proceed to Signature
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Signature */}
        {step === 'signature' && (
          <div className="max-w-lg mx-auto space-y-6">
            {/* Counseling Offer */}
            <div className={`p-4 rounded-xl border-2 ${counselingOffered ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={counselingOffered}
                  onChange={(e) => setCounselingOffered(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-slate-900">Counseling Offered</p>
                  <p className="text-sm text-slate-600">
                    Patient was offered pharmacist consultation regarding their medication(s)
                  </p>
                </div>
              </label>
            </div>

            {/* Signature Pad */}
            <SignaturePad
              onCapture={handleCaptureSignature}
              label="Patient Signature"
              showTimestamp
            />

            {/* Complete */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('verify')}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!signatureData}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
              >
                Complete Pickup (F9)
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="max-w-md mx-auto py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Pickup Complete</h2>
            <p className="text-slate-600 mb-8">
              {selectedRxIds.size} prescription(s) dispensed to {selectedPatient?.firstName} {selectedPatient?.lastName}
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Next Patient
            </button>
          </div>
        )}
      </div>

      <KeyboardShortcuts context="pickup" />
    </div>
  );
}
