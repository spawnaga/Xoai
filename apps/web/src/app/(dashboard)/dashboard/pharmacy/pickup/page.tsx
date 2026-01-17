import { requireSession, logPHIAccess } from '@/lib/auth';
import { PickupStation } from './pickup-station';

export const metadata = {
  title: 'Pickup & Dispense | Xoai Pharmacy',
  description: 'Patient pickup and prescription dispensing',
};

export default async function PickupPage() {
  const session = await requireSession('/dashboard/pharmacy/pickup');

  await logPHIAccess('VIEW', 'Prescription', 'pickup-queue', {
    section: 'pickup-station',
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
      rxNumber: 'RX2026001270',
      patientName: 'John Smith',
      patientDob: '01/15/1990',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      quantity: 30,
      copay: 10.00,
      binLocation: 'A-12',
      isControlled: false,
      readyTime: '10:30 AM',
    },
    {
      id: '2',
      rxNumber: 'RX2026001271',
      patientName: 'John Smith',
      patientDob: '01/15/1990',
      drugName: 'Metformin HCl',
      drugStrength: '500 mg',
      quantity: 90,
      copay: 15.00,
      binLocation: 'A-12',
      isControlled: false,
      readyTime: '10:30 AM',
    },
    {
      id: '3',
      rxNumber: 'RX2026001272',
      patientName: 'Jane Doe',
      patientDob: '03/22/1985',
      drugName: 'Oxycodone HCl',
      drugStrength: '5 mg',
      quantity: 60,
      copay: 25.00,
      binLocation: 'C-3',
      isControlled: true,
      scheduleClass: 'C-II',
      readyTime: '11:15 AM',
    },
  ];

  return (
    <PickupStation
      stats={mockStats}
      prescriptions={mockPrescriptions}
      userId={session.user.id}
    />
  );
}
