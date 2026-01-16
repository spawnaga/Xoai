'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'unknown';
  mrn?: string;
  photo?: string;
  email?: string;
  phone?: string;
  address?: string;
  insuranceProvider?: string;
  allergies?: string[];
  primaryConditions?: string[];
}

export interface PatientCardProps {
  patient: PatientInfo;
  className?: string;
  variant?: 'compact' | 'default' | 'detailed';
  onSelect?: (patient: PatientInfo) => void;
  actions?: React.ReactNode;
  showAllergies?: boolean;
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function getGenderIcon(gender: PatientInfo['gender']): string {
  switch (gender) {
    case 'male':
      return '\u{2642}'; // Male symbol
    case 'female':
      return '\u{2640}'; // Female symbol
    default:
      return '\u{26A5}'; // Male/Female symbol
  }
}

function PatientAvatar({ patient, size = 'md' }: { patient: PatientInfo; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl',
  };

  if (patient.photo) {
    return (
      <img
        src={patient.photo}
        alt={`${patient.firstName} ${patient.lastName}`}
        className={cn('rounded-full object-cover', sizeClasses[size])}
      />
    );
  }

  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
  const bgColor = patient.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700';

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold', sizeClasses[size], bgColor)}
    >
      {initials}
    </div>
  );
}

export function PatientCard({
  patient,
  className,
  variant = 'default',
  onSelect,
  actions,
  showAllergies = true,
}: PatientCardProps) {
  const age = calculateAge(patient.dateOfBirth);
  const isClickable = !!onSelect;

  const handleClick = () => {
    if (onSelect) {
      onSelect(patient);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(patient);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-white',
          isClickable && 'cursor-pointer hover:bg-gray-50 transition-colors',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        <PatientAvatar patient={patient} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="text-sm text-gray-500">
            {age}y {getGenderIcon(patient.gender)} {patient.mrn && `\u00B7 MRN: ${patient.mrn}`}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('rounded-lg border bg-white shadow-sm', className)}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <PatientAvatar patient={patient} size="lg" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {age} years old {getGenderIcon(patient.gender)} {patient.mrn && `\u00B7 MRN: ${patient.mrn}`}
                  </p>
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date of Birth</p>
                  <p className="font-medium">{patient.dateOfBirth.toLocaleDateString()}</p>
                </div>
                {patient.phone && (
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                )}
                {patient.email && (
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium truncate">{patient.email}</p>
                  </div>
                )}
                {patient.insuranceProvider && (
                  <div>
                    <p className="text-gray-500">Insurance</p>
                    <p className="font-medium">{patient.insuranceProvider}</p>
                  </div>
                )}
              </div>

              {patient.address && (
                <div className="mt-4 text-sm">
                  <p className="text-gray-500">Address</p>
                  <p className="font-medium">{patient.address}</p>
                </div>
              )}
            </div>
          </div>

          {showAllergies && patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
              <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                <span>{'\u{26A0}'}</span> Allergies
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {patient.allergies.map((allergy, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.primaryConditions && patient.primaryConditions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700">Conditions</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {patient.primaryConditions.map((condition, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 shadow-sm',
        isClickable && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start gap-4">
        <PatientAvatar patient={patient} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h3>
            {actions}
          </div>
          <p className="text-sm text-gray-500">
            {age} years old {getGenderIcon(patient.gender)}
          </p>
          {patient.mrn && <p className="text-xs text-gray-400 mt-1">MRN: {patient.mrn}</p>}

          {showAllergies && patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <span>{'\u{26A0}'}</span>
              <span>{patient.allergies.slice(0, 2).join(', ')}</span>
              {patient.allergies.length > 2 && (
                <span className="text-gray-400">+{patient.allergies.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
