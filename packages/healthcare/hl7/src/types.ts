export interface HL7Message {
  type: HL7MessageType;
  version: string;
  segments: HL7Segment[];
  raw: string;
}

export type HL7MessageType = 'ADT_A04' | 'ORU_R01' | 'RDE_O11' | 'ACK';

export interface HL7Segment {
  name: string;
  fields: string[];
}

export interface PatientRegistration {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'O' | 'U';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phone?: string;
  ssn?: string;
}

export interface ObservationResult {
  patientId: string;
  orderId: string;
  observationId: string;
  observationCode: string;
  observationName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: 'H' | 'L' | 'N' | 'A';
  observationDateTime: Date;
  resultStatus: 'P' | 'F' | 'C';
}

export interface PharmacyOrder {
  patientId: string;
  orderId: string;
  drugCode: string;
  drugName: string;
  dosage: string;
  route: string;
  frequency: string;
  quantity: number;
  refills?: number;
  prescriberId: string;
  prescriberName: string;
}
