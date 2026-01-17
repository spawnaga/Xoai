'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function FillStationPage() {
  const { data: fills } = api.fill.list.useQuery({ status: 'PENDING' });
  const finalizeMutation = api.fill.finalize.useMutation();

  const [selectedFill, setSelectedFill] = useState<string | null>(null);
  const [ndc, setNdc] = useState('');
  const [lot, setLot] = useState('');
  const [exp, setExp] = useState('');
  const [qty, setQty] = useState(0);

  const handleSubmit = () => {
    if (!selectedFill) return;
    finalizeMutation.mutate({
      fillId: selectedFill,
      ndc,
      lotNumber: lot,
      expirationDate: new Date(exp),
      quantityDispensed: qty,
    });
    setSelectedFill(null);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Fill Station</h1>
      
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
          {selectedFill ? (
            <div className="p-6 bg-white rounded-lg shadow space-y-4">
              <h2 className="text-xl font-bold">Fill Details</h2>
              
              <div>
                <label className="block text-sm font-medium mb-1">NDC</label>
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
                  <label className="block text-sm font-medium mb-1">Expiration</label>
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

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">Product verified</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">Quantity counted</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">Label printed</span>
                </label>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Complete Fill → Move to Verify
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">Select a fill to begin</div>
          )}
        </div>
      </div>
    </div>
  );
}
