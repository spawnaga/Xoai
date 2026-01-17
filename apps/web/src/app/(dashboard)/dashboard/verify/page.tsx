'use client';

import { api } from '@/lib/trpc';

export default function VerifyPage() {
  const { data } = api.verify.list.useQuery();
  const approveMutation = api.verify.approve.useMutation();

  const handleApprove = (fillId: string) => {
    if (confirm('Approve this fill?')) {
      approveMutation.mutate({ fillId });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pharmacist Verification Queue</h1>
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescribed</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispensed</th>
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
              <td className="px-6 py-4">{fill.quantityDispensed}</td>
              <td className="px-6 py-4">
                <button onClick={() => handleApprove(fill.id)} className="text-green-600 hover:text-green-900 font-medium">
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
