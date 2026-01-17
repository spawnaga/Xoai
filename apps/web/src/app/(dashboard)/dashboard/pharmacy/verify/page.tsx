import { requireSession, logPHIAccess } from '@/lib/auth';
import { VerificationWorkstation } from './verification-workstation';

export const metadata = {
  title: 'Pharmacist Verification | Xoai Pharmacy',
  description: 'Review and verify filled prescriptions',
};

export default async function VerifyPage() {
  const session = await requireSession('/dashboard/pharmacy/verify');

  await logPHIAccess('VIEW', 'Prescription', 'verify-queue', {
    section: 'pharmacist-verification',
    userId: session.user.id,
  });

  // Check if user is pharmacist
  const isPharmacist = session.user.role === 'pharmacist' || session.user.role === 'admin';

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
      rxNumber: 'RX2026001260',
      patientName: 'John Smith',
      patientDob: '01/15/1990',
      drugName: 'Lisinopril',
      drugStrength: '10 mg',
      drugForm: 'Tablet',
      ndc: '00069-0150-01',
      quantity: 30,
      daysSupply: 30,
      sig: 'Take 1 tablet by mouth once daily',
      priority: 'NORMAL' as const,
      state: 'VERIFICATION' as const,
      waitingMinutes: 3,
      isControlled: false,
      filledBy: 'Tech Sarah',
      durAlerts: [],
    },
    {
      id: '2',
      rxNumber: 'RX2026001261',
      patientName: 'Jane Doe',
      patientDob: '03/22/1985',
      drugName: 'Oxycodone HCl',
      drugStrength: '5 mg',
      drugForm: 'Tablet',
      ndc: '00078-0369-15',
      quantity: 60,
      daysSupply: 30,
      sig: 'Take 1 tablet by mouth every 6 hours as needed for pain',
      priority: 'STAT' as const,
      state: 'VERIFICATION' as const,
      waitingMinutes: 1,
      isControlled: true,
      scheduleClass: 'C-II',
      filledBy: 'Tech Mike',
      durAlerts: [
        {
          id: 'dur1',
          type: 'drug-drug' as const,
          severity: 'moderate' as const,
          title: 'Opioid + Benzodiazepine',
          description: 'Patient is also taking Alprazolam. Concurrent use may increase CNS depression.',
          recommendation: 'Monitor for respiratory depression and excessive sedation.',
          overrideRequired: true,
        },
      ],
    },
  ];

  if (!isPharmacist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-600">
            Pharmacist verification is restricted to licensed pharmacists only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <VerificationWorkstation
      stats={mockStats}
      prescriptions={mockPrescriptions}
      userId={session.user.id}
      isPharmacist={isPharmacist}
    />
  );
}
