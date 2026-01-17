'use client';

import { useState } from 'react';

interface FillStationProps {
  fillId: string;
  prescription: {
    drugName: string;
    strength: string;
    quantity: number;
    daysSupply: number;
  };
  onComplete: () => void;
}

export default function FillStation({ fillId, prescription, onComplete }: FillStationProps) {
  const [ndc, setNdc] = useState('');
  const [lot, setLot] = useState('');
  const [exp, setExp] = useState('');
  const [qty, setQty] = useState(prescription.quantity);
  const [checklist, setChecklist] = useState({
    productVerified: false,
    quantityCounted: false,
    labelPrinted: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Fill Station</h2>
      
      <div className="p-4 bg-blue-50 rounded">
        <div className="font-medium">{prescription.drugName} {prescription.strength}</div>
        <div className="text-sm text-gray-600">Qty: {prescription.quantity} | Days Supply: {prescription.daysSupply}</div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">NDC (Product Selection)</label>
        <input
          value={ndc}
          onChange={(e) => setNdc(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="00000-0000-00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Lot Number</label>
          <input
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Expiration Date</label>
          <input
            type="date"
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantity Dispensed</label>
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="font-medium text-sm mb-2">Fill Accuracy Checklist:</div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.productVerified}
            onChange={(e) => setChecklist({ ...checklist, productVerified: e.target.checked })}
          />
          <span className="text-sm">Product verified against prescription</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.quantityCounted}
            onChange={(e) => setChecklist({ ...checklist, quantityCounted: e.target.checked })}
          />
          <span className="text-sm">Quantity counted and verified</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist.labelPrinted}
            onChange={(e) => setChecklist({ ...checklist, labelPrinted: e.target.checked })}
          />
          <span className="text-sm">Label printed and affixed</span>
        </label>
      </div>

      <button
        onClick={onComplete}
        disabled={!allChecked || !ndc || !lot || !exp}
        className={`w-full py-2 rounded font-medium ${
          allChecked && ndc && lot && exp
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Complete Fill → Move to VERIFY
      </button>
    </div>
  );
}
