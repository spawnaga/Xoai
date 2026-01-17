'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function FillPage() {
  const [selectedFill, setSelectedFill] = useState<string | null>(null);
  const { data } = api.fill.list.useQuery({ status: 'PENDING' });
  const finalizeMutation = api.fill.finalize.useMutation();

  const handleFinalize = (fillId: string) => {
    const ndc = prompt('Enter NDC:');
    const lot = prompt('Enter Lot Number:');
    const qty = prompt('Enter Quantity Dispensed:');
    
    if (ndc && lot && qty) {
      finalizeMutation.mutate({
        fillId,
        ndc,
        lotNumber: lot,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        quantityDispensed: parseInt(qty),
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fill Queue</h1>
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data?.map((fill) => (
            <tr key={fill.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                {fill.prescription.patient.lastName}, {fill.prescription.patient.firstName}
              </td>
              <td className="px-6 py-4">{fill.prescription.drugName}</td>
              <td className="px-6 py-4">{fill.prescription.quantity}</td>
              <td className="px-6 py-4">
                <button onClick={() => handleFinalize(fill.id)} className="text-blue-600 hover:text-blue-900 font-medium">
                  Finalize
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
