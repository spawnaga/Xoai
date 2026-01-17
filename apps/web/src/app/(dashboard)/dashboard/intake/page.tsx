'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

type IntakeStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export default function IntakePage() {
  const [status, setStatus] = useState<IntakeStatus>('PENDING');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = api.intake.list.useQuery({ status });
  const convertMutation = api.intake.convertToPrescription.useMutation({
    onSuccess: () => setSelectedId(null),
  });

  const handleConvert = (intakeId: string) => {
    if (confirm('Convert this intake to a prescription?')) {
      convertMutation.mutate({ intakeId });
    }
  };

  const tabs: { label: string; value: IntakeStatus }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Review', value: 'IN_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Prescription Intake Queue</h1>

      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-2 font-medium border-b-2 ${
              status === tab.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.items.map((intake) => (
              <tr key={intake.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium">{intake.patient.lastName}, {intake.patient.firstName}</div>
                  <div className="text-sm text-gray-500">MRN: {intake.patient.mrn}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">{intake.drugName}</div>
                  <div className="text-sm text-gray-500">{intake.strength}</div>
                </td>
                <td className="px-6 py-4 text-sm">{intake.channel}</td>
                <td className="px-6 py-4 text-sm">{new Date(intake.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {status === 'PENDING' && (
                    <button onClick={() => handleConvert(intake.id)} className="text-blue-600 hover:text-blue-900 font-medium">
                      Convert
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
