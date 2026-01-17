'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function DispensePage() {
  const { data } = api.dispense.list.useQuery();
  const dispenseMutation = api.dispense.dispense.useMutation();
  const [selectedFill, setSelectedFill] = useState<string | null>(null);

  const handleDispense = (fillId: string) => {
    const confirmed = confirm('Confirm patient identity?');
    if (confirmed) {
      dispenseMutation.mutate({ fillId, identityConfirmed: true });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dispense Queue</h1>
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
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
              <td className="px-6 py-4 text-sm text-gray-500">
                {fill.verifiedAt ? new Date(fill.verifiedAt).toLocaleString() : 'N/A'}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleDispense(fill.id)}
                  className="text-green-600 hover:text-green-900 font-medium"
                >
                  Dispense
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
