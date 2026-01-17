'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';
import PDMPReviewPanel from '@/components/pharmacy/PDMPReviewPanel';

export default function VerifyPage() {
  const { data: fills } = api.fill.list.useQuery({ status: 'COMPLETED' });
  const [selectedFill, setSelectedFill] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    patient: false,
    drug: false,
    sig: false,
    product: false,
    labels: false,
  });

  const fill = fills?.find((f) => f.id === selectedFill);
  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pharmacist Verification</h1>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          {fills?.map((fill) => (
            <button
              key={fill.id}
              onClick={() => setSelectedFill(fill.id)}
              className={`w-full p-4 text-left rounded border ${
                selectedFill === fill.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium">{fill.prescription.patient.firstName} {fill.prescription.patient.lastName}</div>
              <div className="text-sm text-gray-600">Rx #{fill.prescription.id}</div>
            </button>
          ))}
        </div>

        <div className="col-span-2">
          {fill ? (
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Verification Checklist</h2>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checklist.patient}
                      onChange={(e) => setChecklist({ ...checklist, patient: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Patient name and DOB match</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checklist.drug}
                      onChange={(e) => setChecklist({ ...checklist, drug: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Drug, strength, and form correct</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checklist.sig}
                      onChange={(e) => setChecklist({ ...checklist, sig: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Directions (SIG) accurate</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checklist.product}
                      onChange={(e) => setChecklist({ ...checklist, product: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Product appearance and quantity correct</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checklist.labels}
                      onChange={(e) => setChecklist({ ...checklist, labels: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Label and auxiliary labels correct</span>
                  </label>
                </div>
              </div>

              <PDMPReviewPanel patientId={fill.prescription.patientId} isControlled={false} />

              <button
                disabled={!allChecked}
                className={`w-full py-3 rounded font-medium ${
                  allChecked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Approve & Move to Dispense
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">Select a fill to verify</div>
          )}
        </div>
      </div>
    </div>
  );
}
