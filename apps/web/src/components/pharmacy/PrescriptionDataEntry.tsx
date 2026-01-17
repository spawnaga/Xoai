'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

interface PrescriptionDataEntryProps {
  prescriptionId: string;
  onSave?: () => void;
}

export default function PrescriptionDataEntry({ prescriptionId, onSave }: PrescriptionDataEntryProps) {
  const { data: prescription } = api.prescription.getById.useQuery({ id: prescriptionId });
  const updateMutation = api.prescription.update.useMutation({ onSuccess: onSave });

  const [sig, setSig] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [refills, setRefills] = useState(0);
  const [daw, setDaw] = useState(false);
  const [substitution, setSubstitution] = useState(true);

  const handleSave = () => {
    updateMutation.mutate({
      id: prescriptionId,
      sig,
      quantity,
      refills,
      dawCode: daw ? '1' : '0',
      substitutionAllowed: substitution,
    });
  };

  if (!prescription) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Data Entry</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">SIG (Directions)</label>
          <textarea
            value={sig}
            onChange={(e) => setSig(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Take 1 tablet by mouth daily"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Refills</label>
            <input
              type="number"
              value={refills}
              onChange={(e) => setRefills(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={daw} onChange={(e) => setDaw(e.target.checked)} />
            <span className="text-sm">Dispense As Written (DAW)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={substitution} onChange={(e) => setSubstitution(e.target.checked)} />
            <span className="text-sm">Allow Substitution</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save (Cmd+S)
        </button>
      </div>
    </div>
  );
}
