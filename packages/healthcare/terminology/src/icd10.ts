import type { ICD10Code } from './types';

const ICD10_SYSTEM = 'http://hl7.org/fhir/sid/icd-10-cm' as const;

/**
 * Common ICD-10 codes for quick lookup
 * In production, connect to a full ICD-10 database
 */
const COMMON_ICD10_CODES: Record<string, Omit<ICD10Code, 'code' | 'system'>> = {
  'J06.9': { display: 'Acute upper respiratory infection, unspecified', category: 'J06', billable: true },
  'J18.9': { display: 'Pneumonia, unspecified organism', category: 'J18', billable: true },
  'I10': { display: 'Essential (primary) hypertension', category: 'I10', billable: true },
  'E11.9': { display: 'Type 2 diabetes mellitus without complications', category: 'E11', billable: true },
  'F32.9': { display: 'Major depressive disorder, single episode, unspecified', category: 'F32', billable: true },
  'M54.5': { display: 'Low back pain', category: 'M54', billable: true },
  'R05': { display: 'Cough', category: 'R05', billable: true },
  'R50.9': { display: 'Fever, unspecified', category: 'R50', billable: true },
  'Z00.00': { display: 'Encounter for general adult medical examination without abnormal findings', category: 'Z00', billable: true },
};

/**
 * Lookup ICD-10 code
 */
export function lookupICD10(code: string): ICD10Code | undefined {
  const data = COMMON_ICD10_CODES[code.toUpperCase()];
  if (!data) return undefined;

  return {
    code: code.toUpperCase(),
    system: ICD10_SYSTEM,
    ...data,
  };
}

/**
 * Search ICD-10 codes by description
 */
export function searchICD10(query: string): ICD10Code[] {
  const normalizedQuery = query.toLowerCase();

  return Object.entries(COMMON_ICD10_CODES)
    .filter(([, data]) => data.display.toLowerCase().includes(normalizedQuery))
    .map(([code, data]) => ({
      code,
      system: ICD10_SYSTEM,
      ...data,
    }));
}

/**
 * Validate ICD-10 code format
 */
export function isValidICD10Format(code: string): boolean {
  // ICD-10 codes: Letter followed by 2 digits, optionally followed by a decimal and 1-4 alphanumeric characters
  // Extended codes can have a 7th character extension (A=initial, D=subsequent, S=sequela)
  const pattern = /^[A-Z]\d{2}(\.[\dA-Z]{1,4})?$/i;
  return pattern.test(code);
}

/**
 * Get ICD-10 category from code
 */
export function getICD10Category(code: string): string {
  return code.split('.')[0] || code.slice(0, 3);
}
