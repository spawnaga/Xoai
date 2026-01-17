'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function ClaimReviewPanel({ claimId }: { claimId: string }) {
  const { data: claims } = api.claims.list.useQuery({});
  const retryMutation = api.claims.submit.useMutation();
  const reverseMutation = api.claims.reverse.useMutation();
  const [durOverride, setDurOverride] = useState('');

  const claim = claims?.find((c) => c.id === claimId);

  if (!claim) return <div>Loading...</div>;

  const rejectCodes = [
    { code: '70', desc: 'Product/Service Not Covered', action: 'Check formulary or PA' },
    { code: '75', desc: 'Prior Authorization Required', action: 'Submit PA' },
    { code: '79', desc: 'Refill Too Soon', action: 'Override or wait' },
    { code: '88', desc: 'DUR Reject', action: 'Clinical override needed' },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Claim Review</h2>
      
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">BIN:</span>
            <div className="font-medium">{claim.bin}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">PCN:</span>
            <div className="font-medium">{claim.pcn}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Group:</span>
            <div className="font-medium">{claim.group}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status:</span>
            <div className={`font-medium ${claim.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>
              {claim.status}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Plan Paid:</span>
            <div className="font-medium">$0.00</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Patient Owed:</span>
            <div className="font-medium">$0.00</div>
          </div>
        </div>

        {claim.status === 'REJECTED' && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-red-50 rounded">
              <h3 className="font-medium text-red-900 mb-2">Rejection Codes</h3>
              {rejectCodes.map((rc) => (
                <div key={rc.code} className="mb-2 text-sm">
                  <div className="font-medium text-red-800">{rc.code}: {rc.desc}</div>
                  <div className="text-red-600">Action: {rc.action}</div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">DUR Override Reason</label>
              <textarea
                value={durOverride}
                onChange={(e) => setDurOverride(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Enter clinical justification..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => retryMutation.mutate({ fillId: claim.fillId, bin: claim.bin, pcn: claim.pcn, group: claim.group })}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry (B2)
              </button>
              <button
                onClick={() => reverseMutation.mutate({ claimId: claim.id })}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Reverse (B3)
              </button>
            </div>
          </div>
        )}

        {claim.status === 'PAID' && (
          <div className="mt-4">
            <button
              onClick={() => reverseMutation.mutate({ claimId: claim.id })}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reverse Claim (B3)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
