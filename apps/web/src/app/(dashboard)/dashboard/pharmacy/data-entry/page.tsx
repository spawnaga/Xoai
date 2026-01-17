'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';
import PrescriptionDataEntry from '@/components/pharmacy/PrescriptionDataEntry';

export default function DataEntryPage() {
  const [selectedRx, setSelectedRx] = useState<string | null>(null);
  const { data: queue } = api.intake.getQueue.useQuery({ status: 'DATA_ENTRY' });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Entry Queue</h1>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          {queue?.map((rx: { id: string; patientName?: string; drugName?: string }) => (
            <button
              key={rx.id}
              onClick={() => setSelectedRx(rx.id)}
              className={`w-full p-4 text-left rounded border ${
                selectedRx === rx.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium">{rx.patientName}</div>
              <div className="text-sm text-gray-600">{rx.drugName}</div>
            </button>
          ))}
        </div>

        <div className="col-span-2">
          {selectedRx ? (
            <PrescriptionDataEntry
              prescriptionId={selectedRx}
              onSave={() => setSelectedRx(null)}
            />
          ) : (
            <div className="text-center text-gray-500 py-12">Select a prescription to begin</div>
          )}
        </div>
      </div>
    </div>
  );
}
