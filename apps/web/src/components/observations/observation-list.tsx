'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
}

interface ObservationListProps {
  patients: Patient[];
}

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

const statusColors: Record<string, string> = {
  FINAL: 'bg-emerald-100 text-emerald-700',
  PRELIMINARY: 'bg-amber-100 text-amber-700',
  REGISTERED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
  AMENDED: 'bg-purple-100 text-purple-700',
};

export function ObservationList({ patients }: ObservationListProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

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

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <>
      {/* Patient Selection Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label htmlFor="patient-select" className="block text-sm font-medium text-slate-700 mb-2">
              Select Patient
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <select
                id="patient-select"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Choose a patient...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {selectedPatient && (
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-xs text-slate-500">{selectedPatient.mrn}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPatientId ? (
        <>
          {/* Latest Vitals Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Latest Vitals</h2>
            {loadingVitals ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 bg-slate-200 rounded"></div>
                      <div className="w-16 h-3 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-20 h-3 bg-slate-200 rounded mb-2"></div>
                    <div className="w-16 h-6 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : !latestVitals?.length ? (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">No vitals recorded</p>
                <p className="text-xs text-slate-500 mt-1">Record vitals to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {latestVitals.map((vital: { id: string; code: string; value: string | null; unit: string | null; effectiveDate: Date }) => {
                  const vitalInfo = vitalSignCodes[vital.code];
                  return (
                    <div key={vital.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{vitalInfo?.icon || '📊'}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(vital.effectiveDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        {vitalInfo?.name || vital.code}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {vital.value ?? '-'}
                        <span className="text-sm font-normal text-slate-500 ml-1">
                          {vital.unit || vitalInfo?.unit || ''}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <label htmlFor="category-filter" className="text-sm font-medium text-slate-700">
              Filter by:
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Observation History</h3>
            </div>

            {loadingObservations ? (
              <div className="p-8 text-center text-slate-500">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading observations...
              </div>
            ) : !observationsData?.items?.length ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">No observations recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  {categoryFilter ? 'Try adjusting your filter' : 'Record observations to see them here'}
                </p>
                {!categoryFilter && (
                  <Link
                    href="/dashboard/observations/record"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Record Vitals
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Observation
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {observationsData.items.map((obs: {
                      id: string;
                      code: string;
                      display: string | null;
                      value: string | null;
                      unit: string | null;
                      status: string;
                      effectiveDate: Date;
                      codeSystem: string | null;
                    }) => (
                      <tr key={obs.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(obs.effectiveDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(obs.effectiveDate).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {obs.codeSystem === 'http://loinc.org' ? 'Vital Signs' : 'Observation'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {vitalSignCodes[obs.code]?.name || obs.display || obs.code}
                          </div>
                          <div className="text-xs text-slate-500">LOINC: {obs.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">
                            {obs.value !== null ? `${obs.value} ${obs.unit || ''}` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[obs.status] || 'bg-slate-100 text-slate-700'}`}>
                            {obs.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/observations/${obs.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                            title="View"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Select a Patient</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Choose a patient from the dropdown above to view their observations and vital signs history.
          </p>
        </div>
      )}
    </>
  );
}
