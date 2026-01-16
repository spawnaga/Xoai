import type { RxNormCode } from './types';

const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm' as const;

/**
 * Common RxNorm codes for medications
 * In production, connect to RxNorm API or database
 */
const COMMON_RXNORM_CODES: Record<string, Omit<RxNormCode, 'code' | 'system'>> = {
  '161': { display: 'Acetaminophen', tty: 'IN', suppress: false },
  '1191': { display: 'Aspirin', tty: 'IN', suppress: false },
  '2670': { display: 'Codeine', tty: 'IN', suppress: false },
  '3356': { display: 'Diazepam', tty: 'IN', suppress: false },
  '4337': { display: 'Fentanyl', tty: 'IN', suppress: false },
  '5640': { display: 'Ibuprofen', tty: 'IN', suppress: false },
  '6809': { display: 'Metformin', tty: 'IN', suppress: false },
  '7052': { display: 'Morphine', tty: 'IN', suppress: false },
  '8163': { display: 'Oxycodone', tty: 'IN', suppress: false },
  '10689': { display: 'Tramadol', tty: 'IN', suppress: false },
  '42463': { display: 'Amoxicillin', tty: 'IN', suppress: false },
  '83367': { display: 'Atorvastatin', tty: 'IN', suppress: false },
  '197884': { display: 'Lisinopril', tty: 'IN', suppress: false },
  '203150': { display: 'Omeprazole', tty: 'IN', suppress: false },
  '310965': { display: 'Losartan', tty: 'IN', suppress: false },
};

/**
 * Lookup RxNorm code
 */
export function lookupRxNorm(code: string): RxNormCode | undefined {
  const data = COMMON_RXNORM_CODES[code];
  if (!data) return undefined;

  return {
    code,
    system: RXNORM_SYSTEM,
    ...data,
  };
}

/**
 * Search RxNorm codes by drug name
 */
export function searchRxNorm(query: string): RxNormCode[] {
  const normalizedQuery = query.toLowerCase();

  return Object.entries(COMMON_RXNORM_CODES)
    .filter(([, data]) => data.display.toLowerCase().includes(normalizedQuery))
    .map(([code, data]) => ({
      code,
      system: RXNORM_SYSTEM,
      ...data,
    }));
}

/**
 * Get RxNorm code for common drug by name
 */
export function getRxNormByName(drugName: string): RxNormCode | undefined {
  const normalizedName = drugName.toLowerCase();

  const entry = Object.entries(COMMON_RXNORM_CODES).find(
    ([, data]) => data.display.toLowerCase() === normalizedName
  );

  if (!entry) return undefined;

  const [code, data] = entry;
  return {
    code,
    system: RXNORM_SYSTEM,
    ...data,
  };
}
