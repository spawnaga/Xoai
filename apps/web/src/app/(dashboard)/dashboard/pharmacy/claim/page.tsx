import { requireSession, logPHIAccess } from '@/lib/auth';
import { ClaimsWorkstation } from './claims-workstation';

export const metadata = {
  title: 'Claims Processing | Xoai Pharmacy',
  description: 'Manage insurance claims and rejections',
};

export default async function ClaimPage() {
  const session = await requireSession('/dashboard/pharmacy/claim');

  await logPHIAccess('VIEW', 'ClaimTransaction', 'claims-queue', {
    section: 'claims-processing',
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

  const mockClaims = [
    {
      id: '1',
      rxNumber: 'RX2026001245',
      patientName: 'John Smith',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      quantity: 30,
      status: 'rejected' as const,
      rejectCode: '75',
      rejectMessage: 'Prior Authorization Required',
      submittedAt: '2026-01-17T10:30:00Z',
      insuranceName: 'Blue Cross Blue Shield',
      patientPay: 0,
      insurancePay: 0,
    },
    {
      id: '2',
      rxNumber: 'RX2026001246',
      patientName: 'Jane Doe',
      drugName: 'Metformin HCl',
      drugStrength: '500 mg',
      quantity: 90,
      status: 'pending' as const,
      submittedAt: '2026-01-17T11:00:00Z',
      insuranceName: 'Aetna',
      patientPay: 0,
      insurancePay: 0,
    },
    {
      id: '3',
      rxNumber: 'RX2026001247',
      patientName: 'Robert Johnson',
      drugName: 'Atorvastatin',
      drugStrength: '20 mg',
      quantity: 30,
      status: 'approved' as const,
      submittedAt: '2026-01-17T09:15:00Z',
      insuranceName: 'United Healthcare',
      patientPay: 15.00,
      insurancePay: 85.00,
    },
    {
      id: '4',
      rxNumber: 'RX2026001248',
      patientName: 'Emily Williams',
      drugName: 'Omeprazole',
      drugStrength: '20 mg',
      quantity: 30,
      status: 'rejected' as const,
      rejectCode: '70',
      rejectMessage: 'Product/Service Not Covered',
      submittedAt: '2026-01-17T10:45:00Z',
      insuranceName: 'Cigna',
      patientPay: 0,
      insurancePay: 0,
    },
  ];

  return (
    <ClaimsWorkstation
      stats={mockStats}
      claims={mockClaims}
      userId={session.user.id}
    />
  );
}
