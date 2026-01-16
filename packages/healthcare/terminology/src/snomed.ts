import type { SNOMEDCode } from './types';

const SNOMED_SYSTEM = 'http://snomed.info/sct' as const;

/**
 * Common SNOMED CT codes
 */
const COMMON_SNOMED_CODES: Record<string, Omit<SNOMEDCode, 'code' | 'system'>> = {
  '386661006': {
    display: 'Fever',
    conceptId: '386661006',
    fsn: 'Fever (finding)',
  },
  '49727002': {
    display: 'Cough',
    conceptId: '49727002',
    fsn: 'Cough (finding)',
  },
  '25064002': {
    display: 'Headache',
    conceptId: '25064002',
    fsn: 'Headache (finding)',
  },
  '21522001': {
    display: 'Abdominal pain',
    conceptId: '21522001',
    fsn: 'Abdominal pain (finding)',
  },
  '267036007': {
    display: 'Dyspnea',
    conceptId: '267036007',
    fsn: 'Dyspnea (finding)',
  },
  '22298006': {
    display: 'Myocardial infarction',
    conceptId: '22298006',
    fsn: 'Myocardial infarction (disorder)',
  },
  '73211009': {
    display: 'Diabetes mellitus',
    conceptId: '73211009',
    fsn: 'Diabetes mellitus (disorder)',
  },
  '38341003': {
    display: 'Hypertensive disorder',
    conceptId: '38341003',
    fsn: 'Hypertensive disorder (disorder)',
  },
  '195967001': {
    display: 'Asthma',
    conceptId: '195967001',
    fsn: 'Asthma (disorder)',
  },
  '13645005': {
    display: 'Chronic obstructive pulmonary disease',
    conceptId: '13645005',
    fsn: 'Chronic obstructive pulmonary disease (disorder)',
  },
};

/**
 * Lookup SNOMED code
 */
export function lookupSNOMED(code: string): SNOMEDCode | undefined {
  const data = COMMON_SNOMED_CODES[code];
  if (!data) return undefined;

  return {
    code,
    system: SNOMED_SYSTEM,
    ...data,
  };
}

/**
 * Search SNOMED codes by description
 */
export function searchSNOMED(query: string): SNOMEDCode[] {
  const normalizedQuery = query.toLowerCase();

  return Object.entries(COMMON_SNOMED_CODES)
    .filter(
      ([, data]) =>
        data.display.toLowerCase().includes(normalizedQuery) ||
        data.fsn.toLowerCase().includes(normalizedQuery)
    )
    .map(([code, data]) => ({
      code,
      system: SNOMED_SYSTEM,
      ...data,
    }));
}

/**
 * Get SNOMED expression for a clinical finding
 */
export function getSNOMEDExpression(code: string, refinements?: Record<string, string>): string {
  let expression = code;

  if (refinements && Object.keys(refinements).length > 0) {
    const refParts = Object.entries(refinements)
      .map(([attr, val]) => `${attr}=${val}`)
      .join(',');
    expression = `${code}:${refParts}`;
  }

  return expression;
}
