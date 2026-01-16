export interface CDADocument {
  xml: string;
  documentId: string;
  documentType: CDADocumentType;
  createdAt: Date;
}

export type CDADocumentType = 'CCD' | 'DISCHARGE_SUMMARY' | 'PROGRESS_NOTE' | 'HISTORY_PHYSICAL';

export interface CDAPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'UN';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
}

export interface CDAAuthor {
  id: string;
  firstName: string;
  lastName: string;
  npi?: string;
  organization?: string;
}

export interface CDAProblem {
  code: string;
  codeSystem: string;
  displayName: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate?: Date;
  resolutionDate?: Date;
}

export interface CDAMedication {
  code: string;
  codeSystem: string;
  displayName: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'stopped';
}

export interface CDAAllergy {
  substance: string;
  substanceCode?: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'inactive';
}

export interface CDAVitalSign {
  code: string;
  displayName: string;
  value: number;
  unit: string;
  date: Date;
}

export interface CCDContent {
  patient: CDAPatient;
  author: CDAAuthor;
  problems?: CDAProblem[];
  medications?: CDAMedication[];
  allergies?: CDAAllergy[];
  vitalSigns?: CDAVitalSign[];
}
