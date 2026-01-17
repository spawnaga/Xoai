'use client';

import { useState } from 'react';

interface VerifyChecklistProps {
  fillId: string;
  prescription: {
    patientName: string;
    drugName: string;
    strength: string;
    sig: string;
    quantity: number;
  };
  fill: {
    ndc: string;
    lot: string;
    exp: string;
    quantityDispensed: number;
  };
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function VerifyChecklist({ fillId, prescription, fill, onApprove, onReject }: VerifyChecklistProps) {
  const [checklist, setChecklist] = useState({
    patientCorrect: false,
    drugCorrect: false,
    strengthCorrect: false,
    quantityCorrect: false,
    directionsCorrect: false,
    expirationValid: false,
    durReviewed: false,
    interactionsCleared: false,
    allergiesCleared: false,
    labelCorrect: false,
    auxiliaryLabelsCorrect: false,
    packagingAppropriate: false,
    appearanceCorrect: false,
  });

  const [notes, setNotes] = useState('');
  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Pharmacist Verification</h2>
      
      <div className="p-4 bg-gray-50 rounded space-y-2">
        <div><span className="font-medium">Patient:</span> {prescription.patientName}</div>
        <div><span className="font-medium">Drug:</span> {prescription.drugName} {prescription.strength}</div>
        <div><span className="font-medium">SIG:</span> {prescription.sig}</div>
        <div><span className="font-medium">Qty Prescribed:</span> {prescription.quantity}</div>
        <div><span className="font-medium">Qty Dispensed:</span> {fill.quantityDispensed}</div>
        <div><span className="font-medium">NDC:</span> {fill.ndc}</div>
        <div><span className="font-medium">Lot:</span> {fill.lot} | <span className="font-medium">Exp:</span> {fill.exp}</div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="font-medium mb-2">Verification Checklist:</div>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.patientCorrect}
            onChange={(e) => setChecklist({ ...checklist, patientCorrect: e.target.checked })}
          />
          <span className="text-sm">Patient name and DOB verified</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.drugCorrect}
            onChange={(e) => setChecklist({ ...checklist, drugCorrect: e.target.checked })}
          />
          <span className="text-sm">Drug name matches prescription</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.strengthCorrect}
            onChange={(e) => setChecklist({ ...checklist, strengthCorrect: e.target.checked })}
          />
          <span className="text-sm">Strength and form correct</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.quantityCorrect}
            onChange={(e) => setChecklist({ ...checklist, quantityCorrect: e.target.checked })}
          />
          <span className="text-sm">Quantity matches prescription</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.directionsCorrect}
            onChange={(e) => setChecklist({ ...checklist, directionsCorrect: e.target.checked })}
          />
          <span className="text-sm">Directions (SIG) accurate</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.expirationValid}
            onChange={(e) => setChecklist({ ...checklist, expirationValid: e.target.checked })}
          />
          <span className="text-sm">Expiration date valid</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.durReviewed}
            onChange={(e) => setChecklist({ ...checklist, durReviewed: e.target.checked })}
          />
          <span className="text-sm">DUR reviewed and cleared</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.interactionsCleared}
            onChange={(e) => setChecklist({ ...checklist, interactionsCleared: e.target.checked })}
          />
          <span className="text-sm">Drug interactions reviewed</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.allergiesCleared}
            onChange={(e) => setChecklist({ ...checklist, allergiesCleared: e.target.checked })}
          />
          <span className="text-sm">Allergies checked</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.labelCorrect}
            onChange={(e) => setChecklist({ ...checklist, labelCorrect: e.target.checked })}
          />
          <span className="text-sm">Label information correct</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.auxiliaryLabelsCorrect}
            onChange={(e) => setChecklist({ ...checklist, auxiliaryLabelsCorrect: e.target.checked })}
          />
          <span className="text-sm">Auxiliary labels appropriate</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.packagingAppropriate}
            onChange={(e) => setChecklist({ ...checklist, packagingAppropriate: e.target.checked })}
          />
          <span className="text-sm">Packaging appropriate</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.appearanceCorrect}
            onChange={(e) => setChecklist({ ...checklist, appearanceCorrect: e.target.checked })}
          />
          <span className="text-sm">Product appearance correct</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Pharmacist Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={3}
          placeholder="Optional notes or concerns..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={!allChecked}
          className={`flex-1 py-2 rounded font-medium ${
            allChecked
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          ✓ Approve & Move to Dispense
        </button>
        <button
          onClick={() => onReject(notes || 'Verification failed')}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
