'use client';

import { useState, useCallback } from 'react';
import { QueueHeader } from '@/components/pharmacy/queue-header';
import { DrugSearch, type DrugResult } from '@/components/pharmacy/drug-search';
import { PrescriberSearch, type PrescriberResult } from '@/components/pharmacy/prescriber-search';
import { PatientSearch, type PatientResult } from '@/components/pharmacy/patient-search';
import { NotesPanel, type Note } from '@/components/pharmacy/notes-panel';
import { KeyboardShortcuts } from '@/components/pharmacy/keyboard-shortcuts';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

interface DataEntryPrescription {
  id: string;
  rxNumber: string;
  patientName: string;
  patientId: string;
  drugName: string;
  drugStrength?: string;
  quantity: number;
  priority: 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';
  state: 'DATA_ENTRY';
  waitingMinutes?: number;
}

interface DataEntryWorkstationProps {
  stats: {
    intake: number;
    dataEntry: number;
    insurance: number;
    fill: number;
    verify: number;
    ready: number;
  };
  prescriptions: DataEntryPrescription[];
  userId: string;
}

const DAW_CODES = [
  { code: '0', label: 'No Product Selection Indicated' },
  { code: '1', label: 'Substitution Not Allowed by Prescriber' },
  { code: '2', label: 'Substitution Allowed - Patient Requested Brand' },
  { code: '3', label: 'Substitution Allowed - Pharmacist Selected' },
  { code: '4', label: 'Substitution Allowed - Generic Not in Stock' },
  { code: '5', label: 'Brand Dispensed as Generic' },
  { code: '6', label: 'Override' },
  { code: '7', label: 'Brand Mandated by Law' },
  { code: '8', label: 'Generic Not Available' },
  { code: '9', label: 'Other' },
];

const priorityConfig = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NORMAL: { label: 'Normal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  LOW: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

export function DataEntryWorkstation({ stats, prescriptions: initialPrescriptions, userId }: DataEntryWorkstationProps) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [selectedId, setSelectedId] = useState<string | null>(prescriptions[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for the selected prescription
  const [formData, setFormData] = useState({
    drug: null as DrugResult | null,
    prescriber: null as PrescriberResult | null,
    patient: null as PatientResult | null,
    sig: '',
    quantity: '',
    daysSupply: '',
    refills: '0',
    dawCode: '0',
  });

  const [notes, setNotes] = useState<Note[]>([]);

  const selectedPrescription = prescriptions.find(p => p.id === selectedId);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedId || !formData.drug) return;

    // In production, call API to save and submit
    setPrescriptions(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(prescriptions[1]?.id || null);
  }, [selectedId, formData, prescriptions]);

  const handleDrugSelect = (drug: DrugResult) => {
    setFormData(prev => ({ ...prev, drug }));
  };

  const handlePrescriberSelect = (prescriber: PrescriberResult) => {
    setFormData(prev => ({ ...prev, prescriber }));
  };

  const handlePatientSelect = (patient: PatientResult) => {
    setFormData(prev => ({ ...prev, patient }));
  };

  const handleAddNote = (note: { type: string; content: string }) => {
    const newNote: Note = {
      id: Date.now().toString(),
      type: note.type as Note['type'],
      content: note.content,
      createdAt: new Date(),
      createdBy: { id: userId, name: 'Current User' },
    };
    setNotes(prev => [...prev, newNote]);
  };

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'F10',
      handler: handleSubmit,
      description: 'Submit data entry',
      disabled: !selectedId || !formData.drug,
    },
    {
      key: 'F5',
      handler: handleRefresh,
      description: 'Refresh queue',
    },
    {
      key: 'Ctrl+S',
      handler: () => console.log('Save draft'),
      description: 'Save draft',
    },
    {
      key: 'Ctrl+N',
      handler: () => {},
      description: 'New note',
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Entry</h1>
        <p className="mt-1 text-slate-500">
          Enter and verify prescription details
        </p>
      </div>

      {/* Queue Header */}
      <QueueHeader
        stats={stats}
        currentQueue="dataEntry"
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Queue ({prescriptions.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {prescriptions.map((rx) => {
                const priority = priorityConfig[rx.priority];
                const isSelected = selectedId === rx.id;

                return (
                  <button
                    key={rx.id}
                    onClick={() => setSelectedId(rx.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium text-slate-900">{rx.rxNumber}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${priority.bgColor} ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{rx.patientName}</p>
                    <p className="text-xs text-slate-500 truncate">{rx.drugName}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data Entry Form */}
        <div className="lg:col-span-2">
          {selectedPrescription ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{selectedPrescription.rxNumber}</h3>
                    <p className="text-sm text-slate-500">{selectedPrescription.patientName}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${priorityConfig[selectedPrescription.priority].bgColor} ${priorityConfig[selectedPrescription.priority].color}`}>
                    {priorityConfig[selectedPrescription.priority].label}
                  </span>
                </div>
              </div>

              <form className="p-6 space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                {/* Patient */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Patient</label>
                  <PatientSearch onSelect={handlePatientSelect} />
                </div>

                {/* Drug Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Medication</label>
                  <DrugSearch onSelect={handleDrugSelect} />
                  {formData.drug && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{formData.drug.name} {formData.drug.strength}</p>
                          <p className="text-xs text-slate-500 font-mono">NDC: {formData.drug.ndc}</p>
                        </div>
                        {formData.drug.isControlled && (
                          <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded">
                            {formData.drug.scheduleClass}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* SIG / Directions */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Directions (SIG)</label>
                  <textarea
                    value={formData.sig}
                    onChange={(e) => setFormData(prev => ({ ...prev, sig: e.target.value }))}
                    placeholder="Enter directions..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                  />
                </div>

                {/* Quantity / Days Supply */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Days Supply</label>
                    <input
                      type="number"
                      value={formData.daysSupply}
                      onChange={(e) => setFormData(prev => ({ ...prev, daysSupply: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Refills</label>
                    <input
                      type="number"
                      value={formData.refills}
                      onChange={(e) => setFormData(prev => ({ ...prev, refills: e.target.value }))}
                      placeholder="0"
                      min="0"
                      max="11"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Prescriber */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prescriber</label>
                  <PrescriberSearch onSelect={handlePrescriberSelect} />
                </div>

                {/* DAW Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">DAW Code</label>
                  <select
                    value={formData.dawCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, dawCode: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
                  >
                    {DAW_CODES.map((daw) => (
                      <option key={daw.code} value={daw.code}>
                        {daw.code} - {daw.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    Submit to Insurance (F10)
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-lg font-medium text-slate-900">No prescription selected</p>
              <p className="text-sm text-slate-500 mt-1">Select a prescription from the queue</p>
            </div>
          )}
        </div>

        {/* Notes Panel */}
        <div className="lg:col-span-1">
          <NotesPanel
            notes={notes}
            onAddNote={handleAddNote}
            prescriptionId={selectedId || undefined}
          />
        </div>
      </div>

      <KeyboardShortcuts context="data-entry" />
    </div>
  );
}
