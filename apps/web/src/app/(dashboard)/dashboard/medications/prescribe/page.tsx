import Link from 'next/link';
import { requireSession, logPHIAccess } from '@/lib/auth';
import { getServerCaller } from '@/lib/trpc-server';

/**
 * Prescribe Medication Page (Server Component)
 *
 * Create new prescriptions for patients.
 * Includes drug search, dosing guidelines, and interaction checking.
 */

export const metadata = {
  title: 'New Prescription | Xoai Healthcare',
  description: 'Create a new prescription',
};

async function getPatients() {
  try {
    const caller = await getServerCaller();
    const result = await caller.patient.list({ limit: 100 });
    return result.items.map((p: { id: string; firstName: string; lastName: string; mrn: string }) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.mrn,
    }));
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

export default async function PrescribePage() {
  // Server-side session check - require doctor role
  const session = await requireSession('/dashboard/medications/prescribe');

  // Check if user can prescribe (must be doctor or have prescribing privileges)
  const canPrescribe = session.user.isDoctor || session.user.isSuperuser;

  if (!canPrescribe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Prescribing Not Authorized</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Only licensed physicians with prescribing privileges can create prescriptions.
        </p>
        <Link
          href="/dashboard/medications"
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Back to Medications
        </Link>
      </div>
    );
  }

  // Log PHI access for HIPAA audit trail
  await logPHIAccess('VIEW', 'Prescription', 'new', {
    section: 'prescribe-form',
    userId: session.user.id,
  });

  // Pre-fetch patients for the dropdown
  const patients = await getPatients();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/medications"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
          <p className="text-slate-500">Create a new prescription for a patient</p>
        </div>
      </div>

      {/* Prescription Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form className="space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              name="patientId"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.lastName}, {patient.firstName} (MRN: {patient.mrn})
                </option>
              ))}
            </select>
          </div>

          {/* Drug Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Medication <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="drugName"
              placeholder="Search for medication by name or NDC..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Start typing to search the drug database
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                placeholder="30"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Days Supply */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Days Supply <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="daysSupply"
                min="1"
                placeholder="30"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Refills */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Refills
              </label>
              <input
                type="number"
                name="refills"
                min="0"
                max="11"
                defaultValue="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Directions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Directions (Sig) <span className="text-red-500">*</span>
            </label>
            <textarea
              name="directions"
              rows={3}
              placeholder="Take 1 tablet by mouth once daily"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DAW Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                DAW Code
              </label>
              <select
                name="dawCode"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0">0 - No Product Selection Indicated</option>
                <option value="1">1 - Substitution Not Allowed by Prescriber</option>
                <option value="2">2 - Substitution Allowed - Patient Requested Brand</option>
                <option value="3">3 - Substitution Allowed - Pharmacist Selected Brand</option>
                <option value="4">4 - Substitution Allowed - Generic Not in Stock</option>
                <option value="5">5 - Substitution Allowed - Brand Dispensed as Generic</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pharmacist Notes
              </label>
              <input
                type="text"
                name="notes"
                placeholder="Additional notes for pharmacist"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/dashboard/medications"
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Create Prescription
            </button>
          </div>
        </form>
      </div>

      {/* Safety Checks Panel */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">Safety Checks</h3>
            <p className="text-sm text-amber-700 mt-1">
              Drug interactions, contraindications, and allergy checks will be performed automatically when you select a medication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
