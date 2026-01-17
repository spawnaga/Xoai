import { requireSession, logPHIAccess } from '@/lib/auth';
import { DataEntryWorkstation } from './data-entry-workstation';

export const metadata = {
  title: 'Data Entry | Xoai Pharmacy',
  description: 'Enter and verify prescription data',
};

export default async function DataEntryPage() {
  const session = await requireSession('/dashboard/pharmacy/data-entry');

  await logPHIAccess('VIEW', 'Prescription', 'data-entry-queue', {
    section: 'data-entry',
    userId: session.user.id,
  });

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
      rxNumber: 'RX2026001240',
      patientName: 'John Smith',
      patientId: 'P001',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      quantity: 30,
      priority: 'NORMAL' as const,
      state: 'DATA_ENTRY' as const,
      waitingMinutes: 8,
    },
    {
      id: '2',
      rxNumber: 'RX2026001241',
      patientName: 'Jane Doe',
      patientId: 'P002',
      drugName: 'Metformin HCl',
      drugStrength: '500 mg',
      quantity: 90,
      priority: 'URGENT' as const,
      state: 'DATA_ENTRY' as const,
      waitingMinutes: 15,
    },
  ];

  return (
    <DataEntryWorkstation
      stats={mockStats}
      prescriptions={mockPrescriptions}
      userId={session.user.id}
    />
  );
}
