'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

const categoryColors: Record<string, string> = {
  'vital-signs': 'bg-red-100 text-red-800',
  laboratory: 'bg-purple-100 text-purple-800',
  imaging: 'bg-blue-100 text-blue-800',
  procedure: 'bg-green-100 text-green-800',
  exam: 'bg-yellow-100 text-yellow-800',
};

const vitalSignCodes: Record<string, { name: string; unit: string; icon: string }> = {
  '8480-6': { name: 'Systolic BP', unit: 'mmHg', icon: '🫀' },
  '8462-4': { name: 'Diastolic BP', unit: 'mmHg', icon: '🫀' },
  '8867-4': { name: 'Heart Rate', unit: 'bpm', icon: '💓' },
  '9279-1': { name: 'Respiratory Rate', unit: '/min', icon: '🌬️' },
  '8310-5': { name: 'Temperature', unit: '°C', icon: '🌡️' },
  '2708-6': { name: 'O2 Saturation', unit: '%', icon: '💨' },
  '29463-7': { name: 'Weight', unit: 'kg', icon: '⚖️' },
  '8302-2': { name: 'Height', unit: 'cm', icon: '📏' },
};

export default function ObservationsPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Fetch patients for selection
  const { data: patientsData } = trpc.patient.list.useQuery({ limit: 100 });

  // Fetch latest vitals for selected patient
  const { data: latestVitals, isLoading: loadingVitals } = trpc.observation.latestVitals.useQuery(
    { patientId: selectedPatientId },
    { enabled: !!selectedPatientId }
  );

  // Fetch observations list for selected patient
  const { data: observationsData, isLoading: loadingObservations } = trpc.observation.listByPatient.useQuery(
    { patientId: selectedPatientId, limit: 20, code: categoryFilter || undefined },
    { enabled: !!selectedPatientId }
  );

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Observations</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and record patient vitals and clinical observations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/observations/record"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            Record Vitals
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
          {/* Latest Vitals Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Latest Vitals</h2>
            {loadingVitals ? (
              <div className="text-center text-gray-500 py-8">Loading vitals...</div>
            ) : !latestVitals?.length ? (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                No vitals recorded for this patient
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {latestVitals.map((vital) => {
                  const vitalInfo = vitalSignCodes[vital.code];
                  return (
                    <div key={vital.id} className="bg-white shadow rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{vitalInfo?.icon || '📊'}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(vital.effectiveDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500">
                          {vitalInfo?.name || vital.code}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {vital.value ?? '-'}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            {vital.unit || vitalInfo?.unit || ''}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <label htmlFor="category-filter" className="sr-only">Filter by category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
            >
              <option value="">All Categories</option>
              <option value="vital-signs">Vital Signs</option>
              <option value="laboratory">Laboratory</option>
              <option value="imaging">Imaging</option>
              <option value="procedure">Procedure</option>
              <option value="exam">Exam</option>
            </select>
          </div>

          {/* Observations History Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Observation History</h3>
            </div>

            {loadingObservations ? (
              <div className="p-8 text-center text-gray-500">Loading observations...</div>
            ) : !observationsData?.items?.length ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No observations</h3>
                <p className="mt-1 text-sm text-gray-500">No observations recorded for this patient yet.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Observation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {observationsData.items.map((obs) => (
                    <tr key={obs.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(obs.effectiveDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(obs.effectiveDate).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-blue-100 text-blue-800`}>
                          {obs.codeSystem === 'http://loinc.org' ? 'vital-signs' : 'observation'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {vitalSignCodes[obs.code]?.name || obs.display || obs.code}
                        </div>
                        <div className="text-xs text-gray-500">LOINC: {obs.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {obs.value !== null
                            ? `${obs.value} ${obs.unit || ''}`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          obs.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {obs.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/observations/${obs.id}`} className="text-primary-600 hover:text-primary-900">
                          View
                        </Link>
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
            Choose a patient from the dropdown above to view their observations and vitals.
          </p>
        </div>
      )}
    </div>
  );
}
