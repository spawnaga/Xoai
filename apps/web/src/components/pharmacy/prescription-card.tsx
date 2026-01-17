'use client';

import Link from 'next/link';

export type WorkflowPriority = 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';
export type WorkflowState =
  | 'INTAKE' | 'DATA_ENTRY' | 'DATA_ENTRY_COMPLETE'
  | 'INSURANCE_PENDING' | 'INSURANCE_REJECTED'
  | 'DUR_REVIEW' | 'PRIOR_AUTH_PENDING' | 'PRIOR_AUTH_APPROVED'
  | 'FILLING' | 'VERIFICATION' | 'READY'
  | 'SOLD' | 'DELIVERED' | 'RETURNED_TO_STOCK' | 'CANCELLED';

export interface PrescriptionCardData {
  id: string;
  rxNumber: string;
  patientName: string;
  patientDob?: string;
  drugName: string;
  drugStrength?: string;
  quantity: number;
  daysSupply?: number;
  priority: WorkflowPriority;
  state: WorkflowState;
  promiseTime?: Date | string;
  assignedTo?: string;
  waitingMinutes?: number;
  refillNumber?: number;
  isControlled?: boolean;
  hasAlerts?: boolean;
  alertCount?: number;
}

interface PrescriptionCardProps {
  prescription: PrescriptionCardData;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

const priorityConfig: Record<WorkflowPriority, { label: string; color: string; bgColor: string }> = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NORMAL: { label: 'Normal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  LOW: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

const stateConfig: Record<WorkflowState, { label: string; color: string }> = {
  INTAKE: { label: 'Intake', color: 'text-blue-600' },
  DATA_ENTRY: { label: 'Data Entry', color: 'text-indigo-600' },
  DATA_ENTRY_COMPLETE: { label: 'Entry Done', color: 'text-indigo-600' },
  INSURANCE_PENDING: { label: 'Ins. Pending', color: 'text-purple-600' },
  INSURANCE_REJECTED: { label: 'Ins. Rejected', color: 'text-red-600' },
  DUR_REVIEW: { label: 'DUR Review', color: 'text-amber-600' },
  PRIOR_AUTH_PENDING: { label: 'PA Pending', color: 'text-purple-600' },
  PRIOR_AUTH_APPROVED: { label: 'PA Approved', color: 'text-green-600' },
  FILLING: { label: 'Filling', color: 'text-amber-600' },
  VERIFICATION: { label: 'Verification', color: 'text-emerald-600' },
  READY: { label: 'Ready', color: 'text-teal-600' },
  SOLD: { label: 'Sold', color: 'text-slate-600' },
  DELIVERED: { label: 'Delivered', color: 'text-slate-600' },
  RETURNED_TO_STOCK: { label: 'RTS', color: 'text-slate-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-400' },
};

function formatWaitTime(minutes?: number): string {
  if (!minutes) return '--';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatPromiseTime(time?: Date | string): string {
  if (!time) return '--';
  const date = new Date(time);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function PrescriptionCard({
  prescription,
  onSelect,
  isSelected = false,
  showActions = true,
  compact = false,
}: PrescriptionCardProps) {
  const priority = priorityConfig[prescription.priority];
  const state = stateConfig[prescription.state];

  const handleClick = () => {
    if (onSelect) {
      onSelect(prescription.id);
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`
          flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all cursor-pointer
          ${isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }
        `}
      >
        {/* Priority indicator */}
        <div className={`w-1 h-8 rounded-full ${priority.bgColor}`} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-900">
              {prescription.rxNumber}
            </span>
            {prescription.isControlled && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                CS
              </span>
            )}
            {prescription.hasAlerts && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {prescription.alertCount}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {prescription.patientName} • {prescription.drugName}
          </p>
        </div>

        {/* Wait time */}
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">
            {formatWaitTime(prescription.waitingMinutes)}
          </p>
          <p className={`text-xs ${state.color}`}>{state.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white rounded-2xl border p-4 transition-all cursor-pointer
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${priority.bgColor} ${priority.color}`}>
            {priority.label}
          </span>
          {prescription.isControlled && (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
              C-II
            </span>
          )}
        </div>
        <span className={`text-xs font-medium ${state.color}`}>
          {state.label}
        </span>
      </div>

      {/* Rx Number and Drug */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-lg font-bold text-slate-900">
            {prescription.rxNumber}
          </span>
          {prescription.refillNumber !== undefined && prescription.refillNumber > 0 && (
            <span className="text-xs text-slate-500">
              Refill #{prescription.refillNumber}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-700">
          {prescription.drugName}
          {prescription.drugStrength && (
            <span className="text-slate-500"> {prescription.drugStrength}</span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          Qty: {prescription.quantity}
          {prescription.daysSupply && ` • ${prescription.daysSupply} days`}
        </p>
      </div>

      {/* Patient */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
          {prescription.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{prescription.patientName}</p>
          {prescription.patientDob && (
            <p className="text-xs text-slate-500">DOB: {prescription.patientDob}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Wait: {formatWaitTime(prescription.waitingMinutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Promise: {formatPromiseTime(prescription.promiseTime)}</span>
          </div>
        </div>

        {/* Alerts indicator */}
        {prescription.hasAlerts && (
          <div className="flex items-center gap-1 text-amber-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">{prescription.alertCount} alerts</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <Link
            href={`/dashboard/pharmacy/prescription/${prescription.id}`}
            className="flex-1 px-3 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
          <button
            className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(prescription.id);
            }}
          >
            Process
          </button>
        </div>
      )}
    </div>
  );
}

// Prescription list component for queue views
interface PrescriptionListProps {
  prescriptions: PrescriptionCardData[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function PrescriptionList({
  prescriptions,
  selectedId,
  onSelect,
  compact = false,
  emptyMessage = 'No prescriptions in queue',
}: PrescriptionListProps) {
  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-900">{emptyMessage}</p>
        <p className="text-xs text-slate-500 mt-1">Prescriptions will appear here when ready</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {prescriptions.map((rx) => (
          <PrescriptionCard
            key={rx.id}
            prescription={rx}
            onSelect={onSelect}
            isSelected={selectedId === rx.id}
            compact
            showActions={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {prescriptions.map((rx) => (
        <PrescriptionCard
          key={rx.id}
          prescription={rx}
          onSelect={onSelect}
          isSelected={selectedId === rx.id}
        />
      ))}
    </div>
  );
}
