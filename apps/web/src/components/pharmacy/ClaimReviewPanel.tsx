'use client';

import { api } from '@/lib/trpc';

export default function ClaimReviewPanel({ claimId }: { claimId: string }) {
  const { data: claims } = api.claims.list.useQuery({});
  const retryMutation = api.claims.submit.useMutation();
  const reverseMutation = api.claims.reverse.useMutation();

  const claim = claims?.find((c) => c.id === claimId);

  if (!claim) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Claim Review</h2>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {claim.status === 'REJECTED' && (
          <div className="mt-4 p-4 bg-red-50 rounded">
            <h3 className="font-medium text-red-900 mb-2">Rejection Codes</h3>
            <div className="text-sm text-red-700">Review and retry with corrections</div>
            <button
              onClick={() => retryMutation.mutate({ fillId: claim.fillId, bin: claim.bin, pcn: claim.pcn, group: claim.group })}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry Claim
            </button>
          </div>
        )}

        {claim.status === 'PAID' && (
          <button
            onClick={() => reverseMutation.mutate({ claimId: claim.id })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reverse Claim
          </button>
        )}
      </div>
    </div>
  );
}
