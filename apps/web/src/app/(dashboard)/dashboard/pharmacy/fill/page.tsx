import { requireSession, logPHIAccess } from '@/lib/auth';
import { FillStation } from './fill-station';

export const metadata = {
  title: 'Fill Station | Xoai Pharmacy',
  description: 'Fill prescriptions and print labels',
};

export default async function FillPage() {
  const session = await requireSession('/dashboard/pharmacy/fill');

  await logPHIAccess('VIEW', 'Prescription', 'fill-queue', {
    section: 'fill-station',
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
      rxNumber: 'RX2026001250',
      patientName: 'John Smith',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      drugForm: 'Tablet',
      ndc: '00069-0150-01',
      quantity: 30,
      daysSupply: 30,
      sig: 'Take 1 tablet by mouth once daily',
      priority: 'NORMAL' as const,
      state: 'FILLING' as const,
      waitingMinutes: 5,
      isControlled: false,
    },
    {
      id: '2',
      rxNumber: 'RX2026001251',
      patientName: 'Jane Doe',
      drugName: 'Oxycodone HCl',
      drugStrength: '5 mg',
      drugForm: 'Tablet',
      ndc: '00078-0369-15',
      quantity: 60,
      daysSupply: 30,
      sig: 'Take 1 tablet by mouth every 6 hours as needed for pain',
      priority: 'STAT' as const,
      state: 'FILLING' as const,
      waitingMinutes: 2,
      isControlled: true,
      scheduleClass: 'C-II',
    },
  ];

  return (
    <FillStation
      stats={mockStats}
      prescriptions={mockPrescriptions}
      userId={session.user.id}
    />
  );
}
