import type { LOINCCode } from './types';

const LOINC_SYSTEM = 'http://loinc.org' as const;

/**
 * Common LOINC codes for laboratory tests
 */
const COMMON_LOINC_CODES: Record<string, Omit<LOINCCode, 'code' | 'system'>> = {
  '2160-0': {
    display: 'Creatinine [Mass/volume] in Serum or Plasma',
    component: 'Creatinine',
    property: 'MCnc',
    timeAspect: 'Pt',
    systemType: 'Ser/Plas',
    scale: 'Qn',
  },
  '2345-7': {
    display: 'Glucose [Mass/volume] in Serum or Plasma',
    component: 'Glucose',
    property: 'MCnc',
    timeAspect: 'Pt',
    systemType: 'Ser/Plas',
    scale: 'Qn',
  },
  '4548-4': {
    display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
    component: 'Hemoglobin A1c/Hemoglobin.total',
    property: 'MFr',
    timeAspect: 'Pt',
    systemType: 'Bld',
    scale: 'Qn',
  },
  '2093-3': {
    display: 'Cholesterol [Mass/volume] in Serum or Plasma',
    component: 'Cholesterol',
    property: 'MCnc',
    timeAspect: 'Pt',
    systemType: 'Ser/Plas',
    scale: 'Qn',
  },
  '8480-6': {
    display: 'Systolic blood pressure',
    component: 'Systolic blood pressure',
    property: 'Pres',
    timeAspect: 'Pt',
    systemType: 'Arterial system',
    scale: 'Qn',
  },
  '8462-4': {
    display: 'Diastolic blood pressure',
    component: 'Diastolic blood pressure',
    property: 'Pres',
    timeAspect: 'Pt',
    systemType: 'Arterial system',
    scale: 'Qn',
  },
  '8867-4': {
    display: 'Heart rate',
    component: 'Heart rate',
    property: 'NRat',
    timeAspect: 'Pt',
    systemType: '^Patient',
    scale: 'Qn',
  },
  '8310-5': {
    display: 'Body temperature',
    component: 'Body temperature',
    property: 'Temp',
    timeAspect: 'Pt',
    systemType: '^Patient',
    scale: 'Qn',
  },
  '29463-7': {
    display: 'Body weight',
    component: 'Body weight',
    property: 'Mass',
    timeAspect: 'Pt',
    systemType: '^Patient',
    scale: 'Qn',
  },
  '8302-2': {
    display: 'Body height',
    component: 'Body height',
    property: 'Len',
    timeAspect: 'Pt',
    systemType: '^Patient',
    scale: 'Qn',
  },
};

/**
 * Lookup LOINC code
 */
export function lookupLOINC(code: string): LOINCCode | undefined {
  const data = COMMON_LOINC_CODES[code];
  if (!data) return undefined;

  return {
    code,
    system: LOINC_SYSTEM,
    ...data,
  };
}

/**
 * Search LOINC codes by description
 */
export function searchLOINC(query: string): LOINCCode[] {
  const normalizedQuery = query.toLowerCase();

  return Object.entries(COMMON_LOINC_CODES)
    .filter(
      ([, data]) =>
        data.display.toLowerCase().includes(normalizedQuery) ||
        data.component.toLowerCase().includes(normalizedQuery)
    )
    .map(([code, data]) => ({
      code,
      system: LOINC_SYSTEM,
      ...data,
    }));
}

/**
 * Get LOINC code for vital signs
 */
export const VITAL_SIGN_LOINC = {
  SYSTOLIC_BP: '8480-6',
  DIASTOLIC_BP: '8462-4',
  HEART_RATE: '8867-4',
  TEMPERATURE: '8310-5',
  WEIGHT: '29463-7',
  HEIGHT: '8302-2',
  RESPIRATORY_RATE: '9279-1',
  OXYGEN_SATURATION: '2708-6',
} as const;
