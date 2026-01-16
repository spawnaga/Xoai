/**
 * NDC (National Drug Code) Lookup Service
 * The NDC is a unique 10 or 11-digit identifier for human drugs in the US
 * Format: Labeler-Product-Package (e.g., 12345-6789-01)
 */

export interface NDCCode {
  ndc: string;
  labelerName: string;
  productName: string;
  dosageForm: string;
  route: string;
  strength: string;
  strengthUnit: string;
  packageDescription: string;
  deaSchedule?: string;
  marketingCategory: string;
  applicationNumber?: string;
  productType: string;
}

export interface NDCSearchResult {
  code: string;
  display: string;
  labeler: string;
  dosageForm: string;
  strength: string;
  schedule?: string;
}

// Common NDC codes for reference/demo purposes
const SAMPLE_NDC_CODES: NDCCode[] = [
  {
    ndc: '0002-3227-30',
    labelerName: 'Eli Lilly and Company',
    productName: 'Insulin Lispro',
    dosageForm: 'INJECTION, SOLUTION',
    route: 'SUBCUTANEOUS',
    strength: '100',
    strengthUnit: 'UNIT/ML',
    packageDescription: '1 VIAL in 1 CARTON (0002-3227-30) > 10 ML in 1 VIAL',
    marketingCategory: 'BLA',
    applicationNumber: 'BLA020563',
    productType: 'HUMAN PRESCRIPTION DRUG',
  },
  {
    ndc: '0006-0749-31',
    labelerName: 'Merck Sharp & Dohme LLC',
    productName: 'Lisinopril',
    dosageForm: 'TABLET',
    route: 'ORAL',
    strength: '10',
    strengthUnit: 'MG',
    packageDescription: '90 TABLET in 1 BOTTLE (0006-0749-31)',
    marketingCategory: 'ANDA',
    applicationNumber: 'ANDA075640',
    productType: 'HUMAN PRESCRIPTION DRUG',
  },
  {
    ndc: '0069-2550-30',
    labelerName: 'Pfizer Laboratories Div Pfizer Inc',
    productName: 'Amlodipine Besylate',
    dosageForm: 'TABLET',
    route: 'ORAL',
    strength: '5',
    strengthUnit: 'MG',
    packageDescription: '30 TABLET in 1 BOTTLE',
    marketingCategory: 'ANDA',
    productType: 'HUMAN PRESCRIPTION DRUG',
  },
  {
    ndc: '55111-0467-01',
    labelerName: 'Dr. Reddy\'s Laboratories Limited',
    productName: 'Metformin Hydrochloride',
    dosageForm: 'TABLET',
    route: 'ORAL',
    strength: '500',
    strengthUnit: 'MG',
    packageDescription: '100 TABLET in 1 BOTTLE',
    marketingCategory: 'ANDA',
    productType: 'HUMAN PRESCRIPTION DRUG',
  },
  {
    ndc: '0093-0089-01',
    labelerName: 'Teva Pharmaceuticals USA, Inc.',
    productName: 'Hydrocodone Bitartrate and Acetaminophen',
    dosageForm: 'TABLET',
    route: 'ORAL',
    strength: '5 MG/325 MG',
    strengthUnit: 'MG',
    packageDescription: '100 TABLET in 1 BOTTLE',
    deaSchedule: 'CII',
    marketingCategory: 'ANDA',
    productType: 'HUMAN PRESCRIPTION DRUG',
  },
];

/**
 * NDC code system URI
 */
export const NDC_SYSTEM = 'http://hl7.org/fhir/sid/ndc';

/**
 * Validate NDC format (10 or 11 digit with dashes)
 */
export function validateNDCFormat(ndc: string): boolean {
  // 10-digit format: 4-4-2 or 5-3-2 or 5-4-1
  // 11-digit format: 5-4-2
  const patterns = [
    /^\d{4}-\d{4}-\d{2}$/, // 4-4-2
    /^\d{5}-\d{3}-\d{2}$/, // 5-3-2
    /^\d{5}-\d{4}-\d{1}$/, // 5-4-1
    /^\d{5}-\d{4}-\d{2}$/, // 5-4-2 (11-digit)
    /^\d{10,11}$/, // No dashes
  ];

  return patterns.some((pattern) => pattern.test(ndc));
}

/**
 * Normalize NDC to 11-digit format (add leading zeros as needed)
 */
export function normalizeNDC(ndc: string): string {
  // Remove dashes
  const cleaned = ndc.replace(/-/g, '');

  if (cleaned.length === 10) {
    // Convert 10-digit to 11-digit by adding leading zero to labeler
    return '0' + cleaned;
  }

  return cleaned;
}

/**
 * Format NDC with dashes (5-4-2 format)
 */
export function formatNDC(ndc: string): string {
  const normalized = normalizeNDC(ndc);
  if (normalized.length !== 11) return ndc;

  return `${normalized.slice(0, 5)}-${normalized.slice(5, 9)}-${normalized.slice(9)}`;
}

/**
 * Search for NDC codes by product name or labeler
 */
export function searchNDC(query: string): NDCSearchResult[] {
  const lowerQuery = query.toLowerCase();

  return SAMPLE_NDC_CODES.filter(
    (code) =>
      code.productName.toLowerCase().includes(lowerQuery) ||
      code.labelerName.toLowerCase().includes(lowerQuery)
  ).map((code) => ({
    code: code.ndc,
    display: `${code.productName} ${code.strength} ${code.strengthUnit}`,
    labeler: code.labelerName,
    dosageForm: code.dosageForm,
    strength: `${code.strength} ${code.strengthUnit}`,
    schedule: code.deaSchedule,
  }));
}

/**
 * Lookup NDC by code
 */
export function lookupNDC(ndc: string): NDCCode | undefined {
  const normalized = normalizeNDC(ndc);
  return SAMPLE_NDC_CODES.find(
    (code) => normalizeNDC(code.ndc) === normalized
  );
}

/**
 * Get DEA schedule for an NDC
 */
export function getNDCSchedule(ndc: string): string | undefined {
  const code = lookupNDC(ndc);
  return code?.deaSchedule;
}

/**
 * Check if NDC is a controlled substance
 */
export function isControlledSubstance(ndc: string): boolean {
  const schedule = getNDCSchedule(ndc);
  return schedule !== undefined && ['CI', 'CII', 'CIII', 'CIV', 'CV'].includes(schedule);
}

/**
 * Create FHIR CodeableConcept from NDC
 */
export function ndcToCodeableConcept(ndc: string): {
  coding: Array<{ system: string; code: string; display?: string }>;
  text?: string;
} {
  const code = lookupNDC(ndc);

  return {
    coding: [
      {
        system: NDC_SYSTEM,
        code: formatNDC(ndc),
        display: code?.productName,
      },
    ],
    text: code ? `${code.productName} ${code.strength} ${code.strengthUnit}` : undefined,
  };
}

/**
 * NDC Lookup Service class for API integration
 */
export class NDCLookupService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.fda.gov/drug/ndc.json') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search FDA NDC database (requires network access)
   */
  async searchFDA(query: string, limit: number = 10): Promise<NDCSearchResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `${this.baseUrl}?search=${encodedQuery}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFDAResults(data.results || []);
    } catch (error) {
      console.error('NDC lookup error:', error);
      // Fall back to local search
      return searchNDC(query);
    }
  }

  private mapFDAResults(results: unknown[]): NDCSearchResult[] {
    return results.map((result: unknown) => {
      const r = result as {
        product_ndc?: string;
        brand_name?: string;
        generic_name?: string;
        labeler_name?: string;
        dosage_form?: string;
        active_ingredients?: Array<{ strength?: string }>;
        dea_schedule?: string;
      };
      return {
        code: r.product_ndc || '',
        display: r.brand_name || r.generic_name || '',
        labeler: r.labeler_name || '',
        dosageForm: r.dosage_form || '',
        strength: r.active_ingredients?.[0]?.strength || '',
        schedule: r.dea_schedule,
      };
    });
  }
}
