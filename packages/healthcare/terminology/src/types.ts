export interface CodeLookupResult {
  code: string;
  display: string;
  system: string;
  version?: string;
}

export interface ICD10Code extends CodeLookupResult {
  system: 'http://hl7.org/fhir/sid/icd-10-cm';
  category: string;
  billable: boolean;
}

export interface RxNormCode extends CodeLookupResult {
  system: 'http://www.nlm.nih.gov/research/umls/rxnorm';
  tty: string; // Term Type
  suppress: boolean;
}

export interface LOINCCode extends CodeLookupResult {
  system: 'http://loinc.org';
  component: string;
  property: string;
  timeAspect: string;
  systemType: string;
  scale: string;
  method?: string;
}

export interface SNOMEDCode extends CodeLookupResult {
  system: 'http://snomed.info/sct';
  conceptId: string;
  fsn: string; // Fully Specified Name
}

export type MedicalCode = ICD10Code | RxNormCode | LOINCCode | SNOMEDCode;
