'use client';

import { useState } from 'react';

interface DispensePanelProps {
  fillId: string;
  prescription: {
    rxNumber: string;
    patientName: string;
    drugName: string;
    copay: number;
  };
  onComplete: () => void;
}

export default function DispensePanel({ fillId, prescription, onComplete }: DispensePanelProps) {
  const [signature, setSignature] = useState('');
  const [hipaaAck, setHipaaAck] = useState(false);
  const [counselingOffered, setCounselingOffered] = useState(false);
  const [counselingAccepted, setCounselingAccepted] = useState(false);
  const [paymentCollected, setPaymentCollected] = useState(false);

  const canComplete = hipaaAck && counselingOffered && paymentCollected;

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Dispense / Pickup</h2>
      
      <div className="p-4 bg-blue-50 rounded">
        <div className="font-medium">Rx #{prescription.rxNumber}</div>
        <div className="text-sm">{prescription.patientName}</div>
        <div className="text-sm">{prescription.drugName}</div>
        <div className="text-lg font-bold mt-2">Copay: ${prescription.copay.toFixed(2)}</div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hipaaAck}
            onChange={(e) => setHipaaAck(e.target.checked)}
          />
          <span className="text-sm">HIPAA acknowledgment received</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={counselingOffered}
            onChange={(e) => setCounselingOffered(e.target.checked)}
          />
          <span className="text-sm">Counseling offered to patient</span>
        </label>
        
        {counselingOffered && (
          <label className="flex items-center gap-2 ml-6">
            <input
              type="checkbox"
              checked={counselingAccepted}
              onChange={(e) => setCounselingAccepted(e.target.checked)}
            />
            <span className="text-sm">Patient accepted counseling</span>
          </label>
        )}
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paymentCollected}
            onChange={(e) => setPaymentCollected(e.target.checked)}
          />
          <span className="text-sm">Payment collected (${prescription.copay.toFixed(2)})</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Signature Capture</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center">
          <span className="text-gray-400">Signature pad area</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Signature valid for 6 months per HIPAA requirements
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`flex-1 py-3 rounded font-medium ${
            canComplete
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Complete Pickup & Print Receipt
        </button>
        <button className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
          Print Label
        </button>
      </div>

      <div className="text-xs text-gray-500 border-t pt-3">
        <div>Dispensed By: Current User</div>
        <div>Dispensed At: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
