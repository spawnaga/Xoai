'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  STOPPED: 'bg-red-100 text-red-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  stopped: 'bg-red-100 text-red-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

const routeLabels: Record<string, string> = {
  oral: 'Oral',
  topical: 'Topical',
  intravenous: 'IV',
  intramuscular: 'IM',
  subcutaneous: 'SC',
  inhalation: 'Inhalation',
  rectal: 'Rectal',
  ophthalmic: 'Ophthalmic',
  otic: 'Otic',
  nasal: 'Nasal',
};

export default function MedicationsPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Fetch patients for selection
  const { data: patientsData } = trpc.patient.list.useQuery({ limit: 100 });

  // Fetch medications for selected patient
  const { data: medicationsData, isLoading: loadingMedications } = trpc.medication.listByPatient.useQuery(
    {
      patientId: selectedPatientId,
      limit: 50,
      status: (statusFilter || undefined) as 'active' | 'completed' | 'stopped' | 'on-hold' | 'cancelled' | undefined,
      activeOnly: showActiveOnly,
    },
    { enabled: !!selectedPatientId }
  );

  // Fetch active medication count
  const { data: activeCount } = trpc.medication.activeCount.useQuery(
    { patientId: selectedPatientId },
    { enabled: !!selectedPatientId }
  );

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage prescriptions and medication orders
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/medications/prescribe"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            New Prescription
          </Link>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Patient
        </label>
        <select
          id="patient-select"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="block w-full sm:w-96 rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
        >
          <option value="">Choose a patient...</option>
          {patientsData?.items?.map((patient: { id: string; firstName: string; lastName: string; mrn: string }) => (
            <option key={patient.id} value={patient.id}>
              {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
            </option>
          ))}
        </select>
      </div>

      {selectedPatientId && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Medications</dt>
                      <dd className="text-lg font-semibold text-gray-900">{activeCount?.count ?? 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Prescriptions</dt>
                      <dd className="text-lg font-semibold text-gray-900">{medicationsData?.items?.length ?? 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Interaction Check</dt>
                      <dd className="text-sm font-semibold text-primary-600">
                        <Link href={`/dashboard/medications/interactions?patientId=${selectedPatientId}`}>
                          Check Now
                        </Link>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label htmlFor="status-filter" className="sr-only">Filter by status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-40 rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="stopped">Stopped</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="ml-2 text-sm text-gray-600">Show active only</span>
            </label>
          </div>

          {/* Medications Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Medication List</h3>
            </div>

            {loadingMedications ? (
              <div className="p-8 text-center text-gray-500">Loading medications...</div>
            ) : !medicationsData?.items?.length ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No medications</h3>
                <p className="mt-1 text-sm text-gray-500">No medications found for this patient.</p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/medications/prescribe"
                    className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                    </svg>
                    New Prescription
                  </Link>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dosage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicationsData.items.map((med) => (
                    <tr key={med.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{med.name}</div>
                        {med.rxnormCode && <div className="text-xs text-gray-500">RxNorm: {med.rxnormCode}</div>}
                        {med.ndcCode && <div className="text-xs text-gray-500">NDC: {med.ndcCode}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{med.dosage || '-'}</div>
                        {med.frequency && <div className="text-xs text-gray-500">{med.frequency}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{routeLabels[med.route || ''] || med.route || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[med.status] || 'bg-gray-100 text-gray-800'}`}>
                          {med.status.toLowerCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{new Date(med.startDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <Link href={`/dashboard/medications/${med.id}`} className="text-primary-600 hover:text-primary-900">
                          View
                        </Link>
                        {med.status === 'ACTIVE' && (
                          <Link href={`/dashboard/medications/${med.id}/renew`} className="text-green-600 hover:text-green-900">
                            Renew
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!selectedPatientId && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Select a patient</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a patient from the dropdown above to view and manage their medications.
          </p>
        </div>
      )}
    </div>
  );
}
