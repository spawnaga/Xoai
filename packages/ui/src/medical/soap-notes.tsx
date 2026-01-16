'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SOAPNotesFormProps {
  initialValues?: Partial<SOAPNote>;
  onChange?: (values: SOAPNote) => void;
  onSubmit?: (values: SOAPNote) => void;
  className?: string;
  readOnly?: boolean;
  compact?: boolean;
}

export interface SOAPNotesDisplayProps {
  note: SOAPNote;
  className?: string;
  compact?: boolean;
  showHeaders?: boolean;
}

const SOAP_SECTIONS = [
  {
    key: 'subjective' as const,
    label: 'Subjective',
    shortLabel: 'S',
    description: 'Patient\'s symptoms, concerns, and history in their own words',
    placeholder: 'Chief complaint, history of present illness, review of systems...',
    color: 'border-blue-300 bg-blue-50',
  },
  {
    key: 'objective' as const,
    label: 'Objective',
    shortLabel: 'O',
    description: 'Measurable findings from examination and tests',
    placeholder: 'Vital signs, physical exam findings, lab results, imaging...',
    color: 'border-green-300 bg-green-50',
  },
  {
    key: 'assessment' as const,
    label: 'Assessment',
    shortLabel: 'A',
    description: 'Clinical interpretation and diagnosis',
    placeholder: 'Diagnosis, differential diagnoses, clinical reasoning...',
    color: 'border-yellow-300 bg-yellow-50',
  },
  {
    key: 'plan' as const,
    label: 'Plan',
    shortLabel: 'P',
    description: 'Treatment plan and next steps',
    placeholder: 'Medications, procedures, referrals, follow-up, patient education...',
    color: 'border-purple-300 bg-purple-50',
  },
];

export function SOAPNotesForm({
  initialValues,
  onChange,
  onSubmit,
  className,
  readOnly = false,
  compact = false,
}: SOAPNotesFormProps) {
  const [values, setValues] = React.useState<SOAPNote>({
    subjective: initialValues?.subjective || '',
    objective: initialValues?.objective || '',
    assessment: initialValues?.assessment || '',
    plan: initialValues?.plan || '',
  });

  const handleChange = (key: keyof SOAPNote, value: string) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    onChange?.(newValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(values);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {SOAP_SECTIONS.map((section) => (
        <div key={section.key} className={cn('rounded-lg border-l-4 p-4', section.color)}>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white font-bold text-gray-700 shadow-sm">
              {section.shortLabel}
            </span>
            <div>
              <label htmlFor={section.key} className="font-semibold text-gray-900">
                {section.label}
              </label>
              {!compact && (
                <p className="text-xs text-gray-600">{section.description}</p>
              )}
            </div>
          </div>
          <textarea
            id={section.key}
            value={values[section.key]}
            onChange={(e) => handleChange(section.key, e.target.value)}
            placeholder={section.placeholder}
            readOnly={readOnly}
            rows={compact ? 3 : 4}
            className={cn(
              'w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              'placeholder:text-gray-400',
              readOnly && 'bg-gray-50 cursor-not-allowed'
            )}
          />
        </div>
      ))}

      {onSubmit && !readOnly && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setValues({ subjective: '', objective: '', assessment: '', plan: '' })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Save Note
          </button>
        </div>
      )}
    </form>
  );
}

export function SOAPNotesDisplay({
  note,
  className,
  compact = false,
  showHeaders = true,
}: SOAPNotesDisplayProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {SOAP_SECTIONS.map((section) => {
        const content = note[section.key];
        if (!content && compact) return null;

        return (
          <div key={section.key} className={cn('rounded-lg border-l-4 p-3', section.color)}>
            {showHeaders && (
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-700">{section.shortLabel}:</span>
                <span className="text-sm font-medium text-gray-600">{section.label}</span>
              </div>
            )}
            <p className={cn('text-gray-800 whitespace-pre-wrap', !showHeaders && 'font-medium')}>
              {content || <span className="text-gray-400 italic">No {section.label.toLowerCase()} documented</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Template helpers for common SOAP note patterns
export const SOAP_TEMPLATES = {
  wellness: {
    subjective: 'Patient presents for routine wellness exam. No current complaints.',
    objective: 'VS: T__, HR__, BP__/__, RR__, SpO2__%, Wt__\nGeneral: Well-appearing, NAD\nHEENT: NCAT, PERRL, EOMI\nCardio: RRR, no murmurs\nLungs: CTAB\nAbdomen: Soft, NT, ND',
    assessment: 'Annual wellness exam - patient in good health',
    plan: '1. Continue current medications\n2. Age-appropriate screenings discussed\n3. Follow up in 1 year',
  },
  followUp: {
    subjective: 'Patient returns for follow-up of __.',
    objective: 'VS: T__, HR__, BP__/__, RR__, SpO2__%',
    assessment: '__ - controlled/uncontrolled',
    plan: '1. Continue/adjust current medications\n2. Follow up in __ weeks',
  },
  urgentCare: {
    subjective: 'CC: __\nHPI: Patient presents with __ x __ days. Associated symptoms include __. Denies __.',
    objective: 'VS: T__, HR__, BP__/__, RR__, SpO2__%\nGeneral: __\nPertinent exam: __',
    assessment: '1. __',
    plan: '1. __\n2. Return precautions discussed\n3. Follow up with PCP in __ days',
  },
};
