/**
 * CPT (Current Procedural Terminology) Code Service
 * CPT codes are medical procedure codes maintained by the AMA
 * Used for billing and documentation of medical procedures
 */

export interface CPTCode {
  code: string;
  shortDescription: string;
  longDescription: string;
  category: CPTCategory;
  subcategory?: string;
  relativeValueUnits?: number;
  globalPeriod?: number; // Days for post-operative care
  modifiers?: string[];
}

export type CPTCategory =
  | 'evaluation-management' // 99201-99499
  | 'anesthesia' // 00100-01999
  | 'surgery' // 10000-69999
  | 'radiology' // 70000-79999
  | 'pathology-laboratory' // 80000-89999
  | 'medicine' // 90000-99199
  | 'category-ii' // 0001F-9999F (quality measures)
  | 'category-iii'; // 0001T-0999T (emerging technology)

export interface CPTSearchResult {
  code: string;
  display: string;
  category: CPTCategory;
  rvu?: number;
}

// Common CPT codes for E/M and procedures
const SAMPLE_CPT_CODES: CPTCode[] = [
  // Evaluation and Management
  {
    code: '99213',
    shortDescription: 'Office visit, established patient, low complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and low level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 1.3,
    globalPeriod: 0,
  },
  {
    code: '99214',
    shortDescription: 'Office visit, established patient, moderate complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and moderate level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 1.92,
    globalPeriod: 0,
  },
  {
    code: '99215',
    shortDescription: 'Office visit, established patient, high complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and high level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 2.8,
    globalPeriod: 0,
  },
  {
    code: '99203',
    shortDescription: 'Office visit, new patient, low complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of a new patient, which requires a medically appropriate history and/or examination and low level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 1.6,
    globalPeriod: 0,
  },
  {
    code: '99204',
    shortDescription: 'Office visit, new patient, moderate complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of a new patient, which requires a medically appropriate history and/or examination and moderate level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 2.6,
    globalPeriod: 0,
  },
  {
    code: '99205',
    shortDescription: 'Office visit, new patient, high complexity',
    longDescription: 'Office or other outpatient visit for the evaluation and management of a new patient, which requires a medically appropriate history and/or examination and high level of medical decision making.',
    category: 'evaluation-management',
    subcategory: 'Office Visits',
    relativeValueUnits: 3.5,
    globalPeriod: 0,
  },
  // Hospital visits
  {
    code: '99221',
    shortDescription: 'Initial hospital care, low severity',
    longDescription: 'Initial hospital inpatient or observation care, per day, for the evaluation and management of a patient with a low severity problem.',
    category: 'evaluation-management',
    subcategory: 'Hospital Visits',
    relativeValueUnits: 1.92,
    globalPeriod: 0,
  },
  {
    code: '99223',
    shortDescription: 'Initial hospital care, high severity',
    longDescription: 'Initial hospital inpatient or observation care, per day, for the evaluation and management of a patient with a high severity problem.',
    category: 'evaluation-management',
    subcategory: 'Hospital Visits',
    relativeValueUnits: 3.86,
    globalPeriod: 0,
  },
  // Common procedures
  {
    code: '36415',
    shortDescription: 'Venipuncture, routine',
    longDescription: 'Collection of venous blood by venipuncture.',
    category: 'surgery',
    subcategory: 'Cardiovascular',
    relativeValueUnits: 0.17,
    globalPeriod: 0,
  },
  {
    code: '90471',
    shortDescription: 'Immunization administration',
    longDescription: 'Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); 1 vaccine (single or combination vaccine/toxoid).',
    category: 'medicine',
    subcategory: 'Immunization',
    relativeValueUnits: 0.17,
    globalPeriod: 0,
  },
  {
    code: '96372',
    shortDescription: 'Therapeutic injection, subcutaneous/intramuscular',
    longDescription: 'Therapeutic, prophylactic, or diagnostic injection (specify substance or drug); subcutaneous or intramuscular.',
    category: 'medicine',
    subcategory: 'Injections',
    relativeValueUnits: 0.17,
    globalPeriod: 0,
  },
  // Radiology
  {
    code: '71046',
    shortDescription: 'Chest X-ray, 2 views',
    longDescription: 'Radiologic examination, chest; 2 views.',
    category: 'radiology',
    subcategory: 'Diagnostic Radiology',
    relativeValueUnits: 0.22,
    globalPeriod: 0,
  },
  // Laboratory
  {
    code: '85025',
    shortDescription: 'Complete blood count with differential',
    longDescription: 'Blood count; complete (CBC), automated (Hgb, Hct, RBC, WBC and platelet count) and automated differential WBC count.',
    category: 'pathology-laboratory',
    subcategory: 'Hematology',
    relativeValueUnits: 0.0,
    globalPeriod: 0,
  },
  {
    code: '80053',
    shortDescription: 'Comprehensive metabolic panel',
    longDescription: 'Comprehensive metabolic panel: This panel must include the following: Albumin, bilirubin, total calcium, carbon dioxide, chloride, creatinine, glucose, phosphatase, alkaline, potassium, protein, total sodium, AST, ALT, BUN.',
    category: 'pathology-laboratory',
    subcategory: 'Chemistry',
    relativeValueUnits: 0.0,
    globalPeriod: 0,
  },
  {
    code: '83036',
    shortDescription: 'Hemoglobin A1c',
    longDescription: 'Hemoglobin; glycosylated (A1c).',
    category: 'pathology-laboratory',
    subcategory: 'Chemistry',
    relativeValueUnits: 0.0,
    globalPeriod: 0,
  },
];

/**
 * CPT code system URI
 */
export const CPT_SYSTEM = 'http://www.ama-assn.org/go/cpt';

/**
 * Validate CPT code format
 */
export function validateCPTFormat(code: string): boolean {
  // Standard CPT: 5 digits
  // Category II: 4 digits + F
  // Category III: 4 digits + T
  return /^(\d{5}|\d{4}[FT])$/.test(code);
}

/**
 * Get CPT category from code
 */
export function getCPTCategory(code: string): CPTCategory | undefined {
  if (!validateCPTFormat(code)) return undefined;

  // Category II (quality measures)
  if (code.endsWith('F')) return 'category-ii';

  // Category III (emerging technology)
  if (code.endsWith('T')) return 'category-iii';

  const numCode = parseInt(code, 10);

  if (numCode >= 99201 && numCode <= 99499) return 'evaluation-management';
  if (numCode >= 100 && numCode <= 1999) return 'anesthesia';
  if (numCode >= 10000 && numCode <= 69999) return 'surgery';
  if (numCode >= 70000 && numCode <= 79999) return 'radiology';
  if (numCode >= 80000 && numCode <= 89999) return 'pathology-laboratory';
  if (numCode >= 90000 && numCode <= 99199) return 'medicine';

  return undefined;
}

/**
 * Search CPT codes
 */
export function searchCPT(query: string): CPTSearchResult[] {
  const lowerQuery = query.toLowerCase();

  return SAMPLE_CPT_CODES.filter(
    (code) =>
      code.code.includes(query) ||
      code.shortDescription.toLowerCase().includes(lowerQuery) ||
      code.longDescription.toLowerCase().includes(lowerQuery)
  ).map((code) => ({
    code: code.code,
    display: code.shortDescription,
    category: code.category,
    rvu: code.relativeValueUnits,
  }));
}

/**
 * Lookup CPT by code
 */
export function lookupCPT(code: string): CPTCode | undefined {
  return SAMPLE_CPT_CODES.find((c) => c.code === code);
}

/**
 * Get common E/M codes
 */
export function getEMCodes(): CPTSearchResult[] {
  return SAMPLE_CPT_CODES.filter((code) => code.category === 'evaluation-management').map(
    (code) => ({
      code: code.code,
      display: code.shortDescription,
      category: code.category,
      rvu: code.relativeValueUnits,
    })
  );
}

/**
 * Get codes by category
 */
export function getCPTByCategory(category: CPTCategory): CPTSearchResult[] {
  return SAMPLE_CPT_CODES.filter((code) => code.category === category).map((code) => ({
    code: code.code,
    display: code.shortDescription,
    category: code.category,
    rvu: code.relativeValueUnits,
  }));
}

/**
 * Create FHIR CodeableConcept from CPT
 */
export function cptToCodeableConcept(code: string): {
  coding: Array<{ system: string; code: string; display?: string }>;
  text?: string;
} {
  const cptCode = lookupCPT(code);

  return {
    coding: [
      {
        system: CPT_SYSTEM,
        code: code,
        display: cptCode?.shortDescription,
      },
    ],
    text: cptCode?.shortDescription,
  };
}

/**
 * Common CPT modifiers
 */
export const CPT_MODIFIERS = {
  '25': 'Significant, Separately Identifiable E/M Service',
  '26': 'Professional Component',
  '59': 'Distinct Procedural Service',
  'TC': 'Technical Component',
  '76': 'Repeat Procedure by Same Physician',
  '77': 'Repeat Procedure by Another Physician',
  'LT': 'Left Side',
  'RT': 'Right Side',
  '50': 'Bilateral Procedure',
  '51': 'Multiple Procedures',
  '52': 'Reduced Services',
  'GP': 'Physical Therapy',
  'GO': 'Occupational Therapy',
  'GN': 'Speech-Language Pathology',
} as const;

export type CPTModifier = keyof typeof CPT_MODIFIERS;

/**
 * Validate modifier
 */
export function validateModifier(modifier: string): boolean {
  return modifier in CPT_MODIFIERS;
}

/**
 * Get modifier description
 */
export function getModifierDescription(modifier: string): string | undefined {
  return CPT_MODIFIERS[modifier as CPTModifier];
}

/**
 * CPT Lookup Service class for external API integration
 */
export class CPTLookupService {
  /**
   * Note: CPT codes are copyrighted by the AMA
   * Full database access requires a license
   * This service provides basic lookup functionality
   */

  /**
   * Search CPT codes locally
   */
  search(query: string, limit: number = 10): CPTSearchResult[] {
    return searchCPT(query).slice(0, limit);
  }

  /**
   * Lookup single code
   */
  lookup(code: string): CPTCode | undefined {
    return lookupCPT(code);
  }

  /**
   * Get E/M codes for office visits
   */
  getOfficeVisitCodes(): CPTSearchResult[] {
    return getEMCodes().filter((code) =>
      ['99203', '99204', '99205', '99213', '99214', '99215'].includes(code.code)
    );
  }

  /**
   * Get common lab codes
   */
  getCommonLabCodes(): CPTSearchResult[] {
    return getCPTByCategory('pathology-laboratory');
  }
}
