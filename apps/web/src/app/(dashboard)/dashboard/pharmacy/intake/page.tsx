import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';
import { IntakeQueue } from './intake-queue';

export const metadata = {
  title: 'Prescription Intake | Xoai Pharmacy',
  description: 'Process new prescriptions from e-prescribe, fax, phone, and walk-ins',
};

export default async function IntakePage() {
  const session = await requireSession('/dashboard/pharmacy/intake');

  await logPHIAccess('VIEW', 'PrescriptionIntake', 'queue', {
    section: 'intake-queue',
    userId: session.user.id,
  });

  const caller = await getServerCaller();

  // Fetch real data from API
  const [queueSummary, intakesResult] = await Promise.all([
    caller.pharmacyWorkflow.queue.summary(),
    caller.intake.list({ status: 'PENDING', limit: 50 }),
  ]);

  // Map channel enum to UI source type
  const channelToSource = (channel: string): 'eRx' | 'fax' | 'phone' | 'walkin' => {
    switch (channel) {
      case 'E_PRESCRIBE':
      case 'EMR_INTEGRATION':
        return 'eRx';
      case 'FAX':
        return 'fax';
      case 'PHONE':
        return 'phone';
      case 'HARD_COPY':
      case 'TRANSFER_IN':
      case 'REFILL_REQUEST':
      default:
        return 'walkin';
    }
  };

  // Map intakes to the format expected by IntakeQueue component
  const prescriptions = intakesResult.items.map((intake) => ({
    id: intake.id,
    rxNumber: `RX${intake.id.slice(-8).toUpperCase()}`,
    patientName: `${intake.patientFirstName} ${intake.patientLastName}`,
    patientDob: intake.patientDOB
      ? new Date(intake.patientDOB).toLocaleDateString()
      : undefined,
    drugName: intake.drugName,
    drugStrength: undefined, // Not in PrescriptionIntake schema
    quantity: intake.quantity,
    daysSupply: intake.daysSupply ?? undefined,
    priority: 'NORMAL' as const, // Default priority for intakes
    state: 'INTAKE' as const,
    waitingMinutes: Math.round(
      (Date.now() - new Date(intake.createdAt).getTime()) / 60000
    ),
    isControlled: intake.isControlled,
    source: channelToSource(intake.channel),
    prescriberName: intake.prescriberName,
  }));

  const stats = {
    intake: queueSummary.intake,
    dataEntry: queueSummary.dataEntry + queueSummary.dataEntryComplete,
    insurance: queueSummary.insurancePending + queueSummary.insuranceRejected,
    fill: queueSummary.filling,
    verify: queueSummary.verification,
    ready: queueSummary.ready,
  };

  return (
    <IntakeQueue
      stats={stats}
      prescriptions={prescriptions}
      userId={session.user.id}
    />
  );
}
