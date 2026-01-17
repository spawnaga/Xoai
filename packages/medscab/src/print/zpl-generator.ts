/**
 * ZPL Label Generator for Pharmacy Labels
 *
 * Generates Zebra Programming Language (ZPL) commands for:
 * - Prescription labels (main Rx label)
 * - Auxiliary warning labels
 * - Patient identification labels
 * - Will-call bin labels
 *
 * Standard label sizes:
 * - Main Rx: 2.5" x 1.5" (approximately 508 x 304 dots at 203 DPI)
 * - Auxiliary: 1" x 0.5" (approximately 203 x 101 dots at 203 DPI)
 * - Bin: 2" x 1" (approximately 406 x 203 dots at 203 DPI)
 */

export interface PrescriptionLabelData {
  // Patient Info
  patientName: string;
  patientDob?: string;
  patientAddress?: string;

  // Prescription Info
  rxNumber: string;
  drugName: string;
  drugStrength?: string;
  drugForm?: string;
  ndc?: string;
  quantity: number;
  daysSupply: number;

  // Directions
  directions: string;

  // Refill Info
  refillsRemaining: number;
  refillsAuthorized: number;
  fillDate: Date;
  expirationDate?: Date;

  // Prescriber Info
  prescriberName: string;
  prescriberPhone?: string;

  // Pharmacy Info
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;

  // Control Info
  isControlled?: boolean;
  deaSchedule?: number;

  // Auxiliary warnings
  auxiliaryLabels?: string[];
}

export interface AuxiliaryLabelData {
  text: string;
  icon?: 'warning' | 'food' | 'sun' | 'drowsy' | 'alcohol' | 'none';
}

export interface PatientLabelData {
  patientName: string;
  patientDob: string;
  patientMrn?: string;
}

export interface BinLabelData {
  binLocation: string;
  patientName: string;
  rxCount: number;
  readyDate: Date;
}

/**
 * Escape special characters in ZPL strings
 */
function escapeZPL(text: string): string {
  return text
    .replace(/\^/g, '^^')  // Escape caret
    .replace(/~/g, '~')    // Tilde is delimiter
    .substring(0, 100);     // Limit length
}

/**
 * Generate a Code 128 barcode for the Rx number
 */
function generateBarcode(data: string, x: number, y: number, height: number = 50): string {
  return `^FO${x},${y}^BCN,${height},Y,N,N^FD${data}^FS`;
}

/**
 * Generate main prescription label ZPL
 *
 * Layout (2.5" x 1.5" label at 203 DPI = 508 x 304 dots):
 * - Top: Pharmacy name and address
 * - Patient name and Rx number with barcode
 * - Drug name, strength, form
 * - Directions (SIG)
 * - Quantity, days supply, refills
 * - Prescriber name
 * - Fill date, expiration
 * - Controlled substance warning if applicable
 */
export function generatePrescriptionLabel(data: PrescriptionLabelData): string {
  const zpl: string[] = [];

  // Start ZPL
  zpl.push('^XA'); // Start format
  zpl.push('^CF0,20'); // Default font size

  // Pharmacy header
  zpl.push(`^FO10,10^A0N,24,24^FD${escapeZPL(data.pharmacyName)}^FS`);
  if (data.pharmacyAddress) {
    zpl.push(`^FO10,35^A0N,16,16^FD${escapeZPL(data.pharmacyAddress)}^FS`);
  }
  if (data.pharmacyPhone) {
    zpl.push(`^FO10,52^A0N,16,16^FDPh: ${escapeZPL(data.pharmacyPhone)}^FS`);
  }

  // Horizontal line
  zpl.push('^FO10,70^GB488,1,1^FS');

  // Patient name and Rx number
  zpl.push(`^FO10,78^A0N,22,22^FD${escapeZPL(data.patientName)}^FS`);
  zpl.push(`^FO350,78^A0N,18,18^FDRx# ${escapeZPL(data.rxNumber)}^FS`);

  // Barcode
  zpl.push(generateBarcode(data.rxNumber, 350, 98, 40));

  // Drug info
  const drugLine = [data.drugName, data.drugStrength, data.drugForm]
    .filter(Boolean)
    .join(' ');
  zpl.push(`^FO10,105^A0N,26,26^FB480,2,0,L^FD${escapeZPL(drugLine)}^FS`);

  // Quantity and days supply
  zpl.push(`^FO10,135^A0N,18,18^FDQty: ${data.quantity}   Days: ${data.daysSupply}^FS`);

  // NDC
  if (data.ndc) {
    zpl.push(`^FO350,135^A0N,14,14^FDNDC: ${escapeZPL(data.ndc)}^FS`);
  }

  // Directions (SIG) - multi-line field block
  zpl.push(`^FO10,158^A0N,20,20^FB480,3,0,L^FD${escapeZPL(data.directions)}^FS`);

  // Horizontal line
  zpl.push('^FO10,215^GB488,1,1^FS');

  // Refills and dates
  const refillText = `Refills: ${data.refillsRemaining} of ${data.refillsAuthorized}`;
  zpl.push(`^FO10,222^A0N,16,16^FD${refillText}^FS`);

  const fillDateStr = data.fillDate.toLocaleDateString();
  zpl.push(`^FO10,240^A0N,16,16^FDFilled: ${fillDateStr}^FS`);

  if (data.expirationDate) {
    const expDateStr = data.expirationDate.toLocaleDateString();
    zpl.push(`^FO250,240^A0N,16,16^FDDiscard after: ${expDateStr}^FS`);
  }

  // Prescriber
  zpl.push(`^FO10,258^A0N,16,16^FDPrescriber: ${escapeZPL(data.prescriberName)}^FS`);

  // Controlled substance warning
  if (data.isControlled && data.deaSchedule) {
    zpl.push(`^FO10,280^A0N,16,16^GB200,20,1^FS`);
    zpl.push(`^FO15,283^A0N,14,14^FR^FDCONTROLLED SUBSTANCE C-${data.deaSchedule}^FS`);
  }

  // End ZPL
  zpl.push('^XZ');

  return zpl.join('\n');
}

/**
 * Generate auxiliary warning label ZPL
 *
 * Layout (1" x 0.5" label at 203 DPI = 203 x 101 dots):
 * - Icon (if applicable)
 * - Warning text
 */
export function generateAuxiliaryLabel(data: AuxiliaryLabelData): string {
  const zpl: string[] = [];

  // Start ZPL
  zpl.push('^XA');
  zpl.push('^CF0,18');

  // Icon area (simplified - use text symbols)
  let iconText = '';
  switch (data.icon) {
    case 'warning':
      iconText = '!';
      break;
    case 'food':
      iconText = '*';
      break;
    case 'sun':
      iconText = 'O';
      break;
    case 'drowsy':
      iconText = 'Z';
      break;
    case 'alcohol':
      iconText = 'X';
      break;
    default:
      iconText = '';
  }

  if (iconText) {
    // Icon in a box
    zpl.push('^FO5,5^GB30,30,2^FS');
    zpl.push(`^FO12,10^A0N,24,24^FD${iconText}^FS`);
    // Text after icon
    zpl.push(`^FO40,5^A0N,16,16^FB158,2,0,L^FD${escapeZPL(data.text)}^FS`);
  } else {
    // Full width text
    zpl.push(`^FO5,5^A0N,18,18^FB193,2,0,C^FD${escapeZPL(data.text)}^FS`);
  }

  zpl.push('^XZ');

  return zpl.join('\n');
}

/**
 * Generate patient identification label ZPL
 *
 * Layout (2" x 1" label at 203 DPI = 406 x 203 dots):
 * - Patient name (large)
 * - DOB
 * - MRN (if available)
 * - Barcode for MRN
 */
export function generatePatientLabel(data: PatientLabelData): string {
  const zpl: string[] = [];

  zpl.push('^XA');
  zpl.push('^CF0,20');

  // Patient name
  zpl.push(`^FO10,10^A0N,28,28^FD${escapeZPL(data.patientName)}^FS`);

  // DOB
  zpl.push(`^FO10,45^A0N,20,20^FDDOB: ${escapeZPL(data.patientDob)}^FS`);

  // MRN with barcode
  if (data.patientMrn) {
    zpl.push(`^FO10,70^A0N,18,18^FDMRN: ${escapeZPL(data.patientMrn)}^FS`);
    zpl.push(generateBarcode(data.patientMrn, 10, 90, 35));
  }

  zpl.push('^XZ');

  return zpl.join('\n');
}

/**
 * Generate will-call bin label ZPL
 *
 * Layout (2" x 1" label at 203 DPI = 406 x 203 dots):
 * - Bin location (large)
 * - Patient name
 * - Rx count
 * - Ready date
 */
export function generateBinLabel(data: BinLabelData): string {
  const zpl: string[] = [];

  zpl.push('^XA');
  zpl.push('^CF0,20');

  // Bin location in a box
  zpl.push('^FO10,10^GB100,60,2^FS');
  zpl.push(`^FO20,20^A0N,40,40^FD${escapeZPL(data.binLocation)}^FS`);

  // Patient name
  zpl.push(`^FO120,15^A0N,24,24^FD${escapeZPL(data.patientName)}^FS`);

  // Rx count
  zpl.push(`^FO120,45^A0N,18,18^FD${data.rxCount} prescription(s)^FS`);

  // Ready date
  const readyDateStr = data.readyDate.toLocaleDateString();
  zpl.push(`^FO10,80^A0N,16,16^FDReady: ${readyDateStr}^FS`);

  // Barcode for bin lookup
  zpl.push(generateBarcode(data.binLocation, 200, 80, 30));

  zpl.push('^XZ');

  return zpl.join('\n');
}

/**
 * Generate batch of auxiliary labels for a prescription
 */
export function generateAuxiliaryLabels(warnings: string[]): string[] {
  const iconMappings: Record<string, AuxiliaryLabelData['icon']> = {
    food: 'food',
    meal: 'food',
    'empty stomach': 'food',
    drowsy: 'drowsy',
    sleepy: 'drowsy',
    sedation: 'drowsy',
    sun: 'sun',
    sunlight: 'sun',
    photosensitivity: 'sun',
    alcohol: 'alcohol',
    warning: 'warning',
    caution: 'warning',
  };

  return warnings.map((warning) => {
    let icon: AuxiliaryLabelData['icon'] = 'none';

    // Determine icon based on warning text
    const lowerWarning = warning.toLowerCase();
    for (const [keyword, iconType] of Object.entries(iconMappings)) {
      if (lowerWarning.includes(keyword)) {
        icon = iconType;
        break;
      }
    }

    return generateAuxiliaryLabel({ text: warning, icon });
  });
}

/**
 * Common auxiliary label texts
 */
export const AUXILIARY_LABELS = {
  TAKE_WITH_FOOD: 'Take with food',
  TAKE_ON_EMPTY_STOMACH: 'Take on empty stomach',
  MAY_CAUSE_DROWSINESS: 'May cause drowsiness',
  AVOID_ALCOHOL: 'Avoid alcohol',
  AVOID_SUNLIGHT: 'Avoid prolonged sun exposure',
  REFRIGERATE: 'Keep refrigerated',
  SHAKE_WELL: 'Shake well before use',
  DO_NOT_CRUSH: 'Do not crush or chew',
  FINISH_ALL_MEDICATION: 'Finish all medication',
  AVOID_DAIRY: 'Avoid dairy products',
  TAKE_AT_BEDTIME: 'Take at bedtime',
  TAKE_IN_MORNING: 'Take in the morning',
  EXTERNAL_USE_ONLY: 'For external use only',
  FOR_THE_EYE: 'For the eye',
  FOR_THE_EAR: 'For the ear',
  NOT_FOR_INJECTION: 'Not for injection',
};

export type AuxiliaryLabelType = keyof typeof AUXILIARY_LABELS;
