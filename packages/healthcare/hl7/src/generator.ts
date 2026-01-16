import type { PatientRegistration, ObservationResult, PharmacyOrder } from './types';

const FIELD_SEPARATOR = '|';
const COMPONENT_SEPARATOR = '^';
const SEGMENT_TERMINATOR = '\r';

/**
 * Format date for HL7 (YYYYMMDD or YYYYMMDDHHmmss)
 * Uses UTC to avoid timezone inconsistencies
 */
function formatHL7Date(date: Date, includeTime = false): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  if (!includeTime) {
    return `${year}${month}${day}`;
  }

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate MSH (Message Header) segment
 */
function generateMSH(messageType: string, triggerId: string): string {
  const now = new Date();
  const controlId = `${now.getTime()}`;

  return [
    'MSH',
    '^~\\&',
    'XOAI',
    'XOAI_FACILITY',
    'RECEIVING_APP',
    'RECEIVING_FACILITY',
    formatHL7Date(now, true),
    '',
    `${messageType}${COMPONENT_SEPARATOR}${triggerId}`,
    controlId,
    'P',
    '2.5.1',
  ].join(FIELD_SEPARATOR);
}

/**
 * Generate EVN (Event Type) segment
 */
function generateEVN(eventCode: string): string {
  const now = new Date();
  return ['EVN', eventCode, formatHL7Date(now, true)].join(FIELD_SEPARATOR);
}

/**
 * Generate PID (Patient Identification) segment
 */
function generatePID(patient: PatientRegistration): string {
  const address = patient.address
    ? [
        patient.address.street || '',
        '',
        patient.address.city || '',
        patient.address.state || '',
        patient.address.zip || '',
      ].join(COMPONENT_SEPARATOR)
    : '';

  const name = [patient.lastName, patient.firstName].join(COMPONENT_SEPARATOR);

  return [
    'PID',
    '1',
    '',
    patient.patientId,
    '',
    name,
    '',
    formatHL7Date(patient.dateOfBirth),
    patient.gender,
    '',
    '',
    address,
    '',
    patient.phone || '',
    '',
    '',
    '',
    '',
    patient.ssn || '',
  ].join(FIELD_SEPARATOR);
}

/**
 * Generate ADT_A04 (Patient Registration) message
 * Ported from Asclepius/MediXAI
 */
export function generateADT_A04(patient: PatientRegistration): string {
  const segments = [
    generateMSH('ADT', 'A04'),
    generateEVN('A04'),
    generatePID(patient),
    ['PV1', '1', 'O'].join(FIELD_SEPARATOR), // Outpatient visit
  ];

  return segments.join(SEGMENT_TERMINATOR) + SEGMENT_TERMINATOR;
}

/**
 * Generate ORU_R01 (Observation Result) message
 * Ported from Asclepius/MediXAI
 */
export function generateORU_R01(result: ObservationResult): string {
  const obxSegment = [
    'OBX',
    '1',
    'NM',
    `${result.observationCode}${COMPONENT_SEPARATOR}${result.observationName}`,
    '',
    result.value,
    result.unit || '',
    result.referenceRange || '',
    result.abnormalFlag || '',
    '',
    '',
    result.resultStatus,
    '',
    '',
    formatHL7Date(result.observationDateTime, true),
  ].join(FIELD_SEPARATOR);

  const segments = [
    generateMSH('ORU', 'R01'),
    ['PID', '1', '', result.patientId].join(FIELD_SEPARATOR),
    ['OBR', '1', result.orderId, '', '', '', formatHL7Date(result.observationDateTime, true)].join(
      FIELD_SEPARATOR
    ),
    obxSegment,
  ];

  return segments.join(SEGMENT_TERMINATOR) + SEGMENT_TERMINATOR;
}

/**
 * Generate RDE_O11 (Pharmacy Order) message
 * Ported from Asclepius/MediXAI
 */
export function generateRDE_O11(order: PharmacyOrder): string {
  const rxeSegment = [
    'RXE',
    '',
    `${order.drugCode}${COMPONENT_SEPARATOR}${order.drugName}`,
    order.dosage,
    '',
    order.route,
    '',
    '',
    order.quantity.toString(),
    '',
    '',
    (order.refills || 0).toString(),
    '',
    '',
    `${order.prescriberId}${COMPONENT_SEPARATOR}${order.prescriberName}`,
  ].join(FIELD_SEPARATOR);

  const segments = [
    generateMSH('RDE', 'O11'),
    ['PID', '1', '', order.patientId].join(FIELD_SEPARATOR),
    ['ORC', 'NW', order.orderId].join(FIELD_SEPARATOR),
    rxeSegment,
  ];

  return segments.join(SEGMENT_TERMINATOR) + SEGMENT_TERMINATOR;
}

/**
 * Generate ACK (Acknowledgment) message
 */
export function generateACK(
  originalMessageControlId: string,
  ackCode: 'AA' | 'AE' | 'AR' = 'AA',
  errorMessage?: string
): string {
  const segments = [
    generateMSH('ACK', 'A01'),
    ['MSA', ackCode, originalMessageControlId, errorMessage || ''].join(FIELD_SEPARATOR),
  ];

  return segments.join(SEGMENT_TERMINATOR) + SEGMENT_TERMINATOR;
}
