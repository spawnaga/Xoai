import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';
import { WillCallWorkstation } from './will-call-workstation';

export const metadata = {
  title: 'Will-Call | Xoai Healthcare',
  description: 'Manage prescription bins and patient pickups',
};

export default async function WillCallPage() {
  const session = await requireSession('/dashboard/pharmacy/will-call');

  await logPHIAccess('VIEW', 'Pharmacy', 'will-call', {
    section: 'will-call-bins',
    userId: session.user.id,
  });

  const caller = await getServerCaller();

  // Fetch will-call data from API
  const [queueSummary, willCallBins] = await Promise.all([
    caller.pharmacyWorkflow.queue.summary(),
    caller.pharmacyWorkflow.dispense.getWillCallBins({ limit: 100 }),
  ]);

  // Map bins to the format expected by WillCallWorkstation
  const bins = willCallBins.map((bin) => ({
    id: bin.id,
    binLocation: bin.binLocation,
    patientName: bin.prescription?.patient
      ? `${bin.prescription.patient.firstName} ${bin.prescription.patient.lastName}`
      : 'Unknown Patient',
    patientPhone: bin.prescription?.patient?.phone ?? undefined,
    rxCount: 1, // Each fill is one Rx
    rxNumbers: [bin.prescription?.rxNumber ?? `RX${bin.prescriptionId.slice(-8)}`],
    totalCopay: bin.patientPayAmount ?? 0,
    readyDate: bin.verifiedAt ?? bin.filledAt ?? new Date(),
    daysInBin: bin.verifiedAt
      ? Math.floor((Date.now() - new Date(bin.verifiedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    status: (bin.prescription?.workflowState === 'READY'
      ? 'ready'
      : bin.prescription?.workflowState === 'SOLD'
        ? 'picked_up'
        : 'ready') as 'ready' | 'notified' | 'picked_up' | 'return_pending',
    hasControlled: bin.prescription?.isControlled ?? false,
    notificationSent: false, // Would come from notification tracking
  }));

  const stats = {
    ready: queueSummary.ready,
    notified: 0, // Would come from notification system
    expiringSoon: bins.filter((b) => b.daysInBin >= 7).length,
    returnPending: bins.filter((b) => b.daysInBin >= 10).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pharmacy"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Will-Call Management</h1>
          <p className="mt-1 text-slate-500">
            Manage prescription bins, patient pickups, and return-to-stock
          </p>
        </div>
      </div>

      <WillCallWorkstation
        bins={bins}
        stats={stats}
        userId={session.user.id}
      />
    </div>
  );
}
