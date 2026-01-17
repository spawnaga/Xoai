/**
 * Drug Search Service
 *
 * Provides drug lookup functionality with RxNorm integration
 * and local database fallback.
 */

import type {
  Drug,
  DrugSearchParams,
  DrugSearchResult,
  DEASchedule,
} from './types';

// RxNorm API base URL
const RXNORM_API_BASE = 'https://rxnav.nlm.nih.gov/REST';

/**
 * Search for drugs by name, NDC, or other identifiers
 */
export async function searchDrugs(params: DrugSearchParams): Promise<DrugSearchResult> {
  const { query, limit = 25, dosageForm, route } = params;

  try {
    // Try RxNorm API first
    const rxnormResults = await searchRxNorm(query, limit);

    if (rxnormResults.length > 0) {
      // Filter by dosage form and route if specified
      let filtered = rxnormResults;

      if (dosageForm) {
        filtered = filtered.filter((d) =>
          d.dosageForm.toLowerCase().includes(dosageForm.toLowerCase())
        );
      }

      if (route) {
        filtered = filtered.filter((d) =>
          d.route.toLowerCase().includes(route.toLowerCase())
        );
      }

      return {
        drugs: filtered.slice(0, limit),
        totalCount: filtered.length,
        source: 'rxnorm',
      };
    }
  } catch (error) {
    console.error('RxNorm API error, falling back to local data:', error);
  }

  // Fall back to sample data
  const fallbackResults = searchFallbackDrugs(query, limit, dosageForm, route);

  return {
    drugs: fallbackResults,
    totalCount: fallbackResults.length,
    source: 'fallback',
  };
}

/**
 * Search RxNorm API for drug information
 */
async function searchRxNorm(query: string, limit: number): Promise<Drug[]> {
  const encodedQuery = encodeURIComponent(query);

  // Search for drugs by name
  const response = await fetch(
    `${RXNORM_API_BASE}/drugs.json?name=${encodedQuery}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    }
  );

  if (!response.ok) {
    throw new Error(`RxNorm API error: ${response.status}`);
  }

  const data = await response.json() as { drugGroup?: { conceptGroup?: Array<{ conceptProperties?: Array<{ rxcui: string }> }> } };
  const drugs: Drug[] = [];

  // Parse RxNorm response
  const drugGroup = data.drugGroup;
  if (!drugGroup?.conceptGroup) {
    return drugs;
  }

  for (const group of drugGroup.conceptGroup) {
    if (!group.conceptProperties) continue;

    for (const concept of group.conceptProperties) {
      if (drugs.length >= limit) break;

      const drug = await getRxNormDrugDetails(concept.rxcui);
      if (drug) {
        drugs.push(drug);
      }
    }
  }

  return drugs;
}

/**
 * Get detailed drug information from RxNorm
 */
async function getRxNormDrugDetails(rxcui: string): Promise<Drug | null> {
  try {
    const response = await fetch(
      `${RXNORM_API_BASE}/rxcui/${rxcui}/allrelated.json`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json() as { allRelatedGroup?: { conceptGroup?: Array<{ tty?: string; conceptProperties?: Array<{ name: string }> }> } };
    const relatedGroup = data.allRelatedGroup;

    if (!relatedGroup?.conceptGroup) return null;

    // Extract drug information from concept groups
    let genericName = '';
    let brandName = '';
    let strength = '';
    let dosageForm = '';
    let route = 'oral';

    for (const group of relatedGroup.conceptGroup) {
      const concepts = group.conceptProperties || [];

      for (const concept of concepts) {
        switch (group.tty) {
          case 'IN': // Ingredient
            genericName = genericName || concept.name;
            break;
          case 'BN': // Brand Name
            brandName = brandName || concept.name;
            break;
          case 'SCD': // Semantic Clinical Drug
          case 'SBD': // Semantic Branded Drug
            // Parse strength and form from name
            const parsed = parseDrugName(concept.name);
            strength = strength || parsed.strength;
            dosageForm = dosageForm || parsed.dosageForm;
            break;
          case 'DF': // Dose Form
            dosageForm = dosageForm || concept.name;
            break;
        }
      }
    }

    if (!genericName && !brandName) return null;

    return {
      id: rxcui,
      ndc: '', // Would need separate NDC lookup
      genericName: genericName || brandName,
      brandName: brandName || '',
      strength,
      dosageForm,
      route,
      unit: extractUnit(strength),
      manufacturer: '',
      activeIngredients: genericName ? [genericName] : [],
      rxcui,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching RxNorm details for ${rxcui}:`, error);
    return null;
  }
}

/**
 * Parse drug name to extract strength and dosage form
 */
function parseDrugName(name: string): { strength: string; dosageForm: string } {
  // Common patterns: "Drug Name 10 MG Oral Tablet"
  const strengthMatch = name.match(/(\d+\.?\d*)\s*(MG|MCG|G|ML|%|UNIT|IU)/i);
  const formMatch = name.match(/(tablet|capsule|solution|injection|cream|ointment|suspension|syrup|patch|inhaler|spray)/i);

  const strengthValue = strengthMatch?.[1];
  const strengthUnit = strengthMatch?.[2];
  const formValue = formMatch?.[1];

  return {
    strength: strengthValue && strengthUnit ? `${strengthValue} ${strengthUnit.toUpperCase()}` : '',
    dosageForm: formValue ? formValue.toLowerCase() : '',
  };
}

/**
 * Extract unit from strength string
 */
function extractUnit(strength: string): string {
  const match = strength.match(/(MG|MCG|G|ML|%|UNIT|IU)/i);
  const unit = match?.[1];
  return unit ? unit.toUpperCase() : 'MG';
}

/**
 * Fallback drug database for when RxNorm is unavailable
 */
const FALLBACK_DRUGS: Drug[] = [
  // Common medications
  {
    id: 'fb-001',
    ndc: '00069-0150-30',
    genericName: 'lisinopril',
    brandName: 'Zestril',
    strength: '10 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'AstraZeneca',
    activeIngredients: ['lisinopril'],
    deaSchedule: 'LEGEND',
    drugClass: 'ACE Inhibitor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-002',
    ndc: '00071-0156-23',
    genericName: 'metformin',
    brandName: 'Glucophage',
    strength: '500 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Bristol-Myers Squibb',
    activeIngredients: ['metformin hydrochloride'],
    deaSchedule: 'LEGEND',
    drugClass: 'Biguanide',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-003',
    ndc: '00093-0150-01',
    genericName: 'atorvastatin',
    brandName: 'Lipitor',
    strength: '20 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Pfizer',
    activeIngredients: ['atorvastatin calcium'],
    deaSchedule: 'LEGEND',
    drugClass: 'HMG-CoA Reductase Inhibitor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-004',
    ndc: '00591-0405-01',
    genericName: 'amlodipine',
    brandName: 'Norvasc',
    strength: '5 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Pfizer',
    activeIngredients: ['amlodipine besylate'],
    deaSchedule: 'LEGEND',
    drugClass: 'Calcium Channel Blocker',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-005',
    ndc: '00378-0208-01',
    genericName: 'omeprazole',
    brandName: 'Prilosec',
    strength: '20 MG',
    dosageForm: 'capsule',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'AstraZeneca',
    activeIngredients: ['omeprazole'],
    deaSchedule: 'OTC',
    drugClass: 'Proton Pump Inhibitor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-006',
    ndc: '00054-0162-25',
    genericName: 'hydrocodone/acetaminophen',
    brandName: 'Vicodin',
    strength: '5/325 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'AbbVie',
    activeIngredients: ['hydrocodone bitartrate', 'acetaminophen'],
    deaSchedule: 'II',
    drugClass: 'Opioid Analgesic',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-007',
    ndc: '00093-3147-01',
    genericName: 'alprazolam',
    brandName: 'Xanax',
    strength: '0.5 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Pfizer',
    activeIngredients: ['alprazolam'],
    deaSchedule: 'IV',
    drugClass: 'Benzodiazepine',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-008',
    ndc: '00069-0266-30',
    genericName: 'amoxicillin',
    brandName: 'Amoxil',
    strength: '500 MG',
    dosageForm: 'capsule',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'GlaxoSmithKline',
    activeIngredients: ['amoxicillin trihydrate'],
    deaSchedule: 'LEGEND',
    drugClass: 'Penicillin Antibiotic',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-009',
    ndc: '00781-1506-01',
    genericName: 'gabapentin',
    brandName: 'Neurontin',
    strength: '300 MG',
    dosageForm: 'capsule',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Pfizer',
    activeIngredients: ['gabapentin'],
    deaSchedule: 'LEGEND',
    drugClass: 'Anticonvulsant',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-010',
    ndc: '00310-0274-30',
    genericName: 'levothyroxine',
    brandName: 'Synthroid',
    strength: '50 MCG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MCG',
    manufacturer: 'AbbVie',
    activeIngredients: ['levothyroxine sodium'],
    deaSchedule: 'LEGEND',
    drugClass: 'Thyroid Hormone',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-011',
    ndc: '00002-3004-30',
    genericName: 'insulin glargine',
    brandName: 'Lantus',
    strength: '100 UNIT/ML',
    dosageForm: 'injection',
    route: 'subcutaneous',
    unit: 'UNIT',
    manufacturer: 'Sanofi',
    activeIngredients: ['insulin glargine'],
    deaSchedule: 'LEGEND',
    drugClass: 'Long-Acting Insulin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-012',
    ndc: '00006-0277-31',
    genericName: 'warfarin',
    brandName: 'Coumadin',
    strength: '5 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Bristol-Myers Squibb',
    activeIngredients: ['warfarin sodium'],
    deaSchedule: 'LEGEND',
    drugClass: 'Anticoagulant',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-013',
    ndc: '00093-0832-01',
    genericName: 'prednisone',
    brandName: 'Deltasone',
    strength: '10 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Pfizer',
    activeIngredients: ['prednisone'],
    deaSchedule: 'LEGEND',
    drugClass: 'Corticosteroid',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-014',
    ndc: '00591-5613-01',
    genericName: 'tramadol',
    brandName: 'Ultram',
    strength: '50 MG',
    dosageForm: 'tablet',
    route: 'oral',
    unit: 'MG',
    manufacturer: 'Janssen',
    activeIngredients: ['tramadol hydrochloride'],
    deaSchedule: 'IV',
    drugClass: 'Opioid Analgesic',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fb-015',
    ndc: '00173-0682-00',
    genericName: 'fluticasone/salmeterol',
    brandName: 'Advair',
    strength: '250/50 MCG',
    dosageForm: 'inhaler',
    route: 'inhalation',
    unit: 'MCG',
    manufacturer: 'GlaxoSmithKline',
    activeIngredients: ['fluticasone propionate', 'salmeterol xinafoate'],
    deaSchedule: 'LEGEND',
    drugClass: 'Corticosteroid/LABA Combination',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Search fallback drug database
 */
function searchFallbackDrugs(
  query: string,
  limit: number,
  dosageForm?: string,
  route?: string
): Drug[] {
  const lowerQuery = query.toLowerCase();

  return FALLBACK_DRUGS.filter((drug) => {
    // Match by name
    const nameMatch =
      drug.genericName.toLowerCase().includes(lowerQuery) ||
      drug.brandName.toLowerCase().includes(lowerQuery) ||
      drug.ndc.includes(query);

    if (!nameMatch) return false;

    // Filter by dosage form
    if (dosageForm && !drug.dosageForm.toLowerCase().includes(dosageForm.toLowerCase())) {
      return false;
    }

    // Filter by route
    if (route && !drug.route.toLowerCase().includes(route.toLowerCase())) {
      return false;
    }

    return true;
  }).slice(0, limit);
}

/**
 * Get drug by ID or NDC
 */
export async function getDrugById(id: string): Promise<Drug | null> {
  // Check fallback database first
  const fallbackDrug = FALLBACK_DRUGS.find(
    (d) => d.id === id || d.ndc === id || d.rxcui === id
  );

  if (fallbackDrug) {
    return fallbackDrug;
  }

  // Try RxNorm if it looks like an RXCUI
  if (/^\d+$/.test(id)) {
    try {
      return await getRxNormDrugDetails(id);
    } catch (error) {
      console.error('Error fetching drug from RxNorm:', error);
    }
  }

  return null;
}

/**
 * Get multiple drugs by IDs
 */
export async function getDrugsByIds(ids: string[]): Promise<Drug[]> {
  const drugs: Drug[] = [];

  for (const id of ids) {
    const drug = await getDrugById(id);
    if (drug) {
      drugs.push(drug);
    }
  }

  return drugs;
}

/**
 * Validate NDC format
 */
export function isValidNDC(ndc: string): boolean {
  // NDC formats: 4-4-2, 5-3-2, 5-4-1, 5-4-2 (with or without dashes)
  const ndcPatterns = [
    /^\d{4}-\d{4}-\d{2}$/,
    /^\d{5}-\d{3}-\d{2}$/,
    /^\d{5}-\d{4}-\d{1}$/,
    /^\d{5}-\d{4}-\d{2}$/,
    /^\d{10,11}$/, // Without dashes
  ];

  return ndcPatterns.some((pattern) => pattern.test(ndc));
}
