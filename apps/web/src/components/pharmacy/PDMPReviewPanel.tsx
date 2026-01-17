'use client';

interface PDMPReviewPanelProps {
  patientId: string;
  isControlled: boolean;
}

export default function PDMPReviewPanel({ patientId, isControlled }: PDMPReviewPanelProps) {
  if (!isControlled) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-900 mb-2">⚠️ Controlled Substance - PDMP Review Required</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="pdmp-checked" />
          <label htmlFor="pdmp-checked">PDMP query completed</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="no-flags" />
          <label htmlFor="no-flags">No risk flags identified</label>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Justification (if overriding):</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={2}
            placeholder="Enter clinical justification..."
          />
        </div>
      </div>
    </div>
  );
}
