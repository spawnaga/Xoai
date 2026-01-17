'use client';

import { api } from '@/lib/trpc';
import ClaimReviewPanel from '@/components/pharmacy/ClaimReviewPanel';

export default function ClaimsPage() {
  const { data: claims } = api.claims.list.useQuery({});

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Claims & Rejections</h1>
      
      <div className="grid gap-4">
        {claims?.map((claim: { id: string }) => (
          <ClaimReviewPanel key={claim.id} claimId={claim.id} />
        ))}
        {!claims?.length && (
          <div className="text-center text-gray-500 py-12">No claims to review</div>
        )}
      </div>
    </div>
  );
}
