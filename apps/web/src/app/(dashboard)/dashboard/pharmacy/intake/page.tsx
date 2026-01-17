import { requireSession, logPHIAccess } from '@/lib/auth';
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

  // Mock data - in production, fetch from API
  const mockStats = {
    intake: 12,
    dataEntry: 8,
    insurance: 5,
    fill: 15,
    verify: 6,
    ready: 22,
  };

  const mockPrescriptions = [
    {
      id: '1',
      rxNumber: 'RX2026001234',
      patientName: 'John Smith',
      patientDob: '01/15/1990',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      quantity: 30,
      daysSupply: 30,
      priority: 'NORMAL' as const,
      state: 'INTAKE' as const,
      waitingMinutes: 15,
      source: 'eRx' as const,
      prescriberName: 'Dr. Sarah Johnson',
    },
    {
      id: '2',
      rxNumber: 'RX2026001235',
      patientName: 'Jane Doe',
      patientDob: '03/22/1985',
      drugName: 'Oxycodone HCl',
      drugStrength: '5 mg',
      quantity: 60,
      daysSupply: 30,
      priority: 'STAT' as const,
      state: 'INTAKE' as const,
      waitingMinutes: 5,
      isControlled: true,
      source: 'phone' as const,
      prescriberName: 'Dr. Michael Chen',
    },
    {
      id: '3',
      rxNumber: 'RX2026001236',
      patientName: 'Robert Johnson',
      patientDob: '07/08/1978',
      drugName: 'Metformin',
      drugStrength: '500 mg',
      quantity: 90,
      daysSupply: 30,
      priority: 'LOW' as const,
      state: 'INTAKE' as const,
      waitingMinutes: 45,
      source: 'fax' as const,
      prescriberName: 'Dr. Emily Williams',
    },
  ];

  return (
    <IntakeQueue
      stats={mockStats}
      prescriptions={mockPrescriptions}
      userId={session.user.id}
    />
  );
}
