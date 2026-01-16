/**
 * Immunization Services Module
 *
 * Provides comprehensive immunization management:
 * - Vaccine inventory with temperature monitoring
 * - Standing orders and protocols
 * - Immunization administration records
 * - State immunization registry (IIS) reporting
 * - VFC (Vaccines for Children) eligibility tracking
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Vaccine storage temperature type
 */
export type VaccineStorageType =
  | 'refrigerated' // 2-8°C (36-46°F)
  | 'frozen' // -50 to -15°C (-58 to 5°F)
  | 'ultra_cold' // -90 to -60°C (-130 to -76°F)
  | 'room_temp'; // 15-25°C (59-77°F)

/**
 * Administration route
 */
export type AdministrationRoute =
  | 'intramuscular' // IM
  | 'subcutaneous' // SC/SQ
  | 'intradermal' // ID
  | 'oral' // PO
  | 'nasal' // IN
  | 'inhalation';

/**
 * Administration site
 */
export type AdministrationSite =
  | 'left_deltoid'
  | 'right_deltoid'
  | 'left_vastus_lateralis' // Thigh
  | 'right_vastus_lateralis'
  | 'left_gluteal'
  | 'right_gluteal'
  | 'oral'
  | 'nasal'
  | 'other';

/**
 * VFC eligibility reason
 */
export type VFCEligibilityReason =
  | 'medicaid'
  | 'uninsured'
  | 'american_indian_alaska_native'
  | 'underinsured'
  | 'not_eligible';

/**
 * Standing order status
 */
export type StandingOrderStatus = 'active' | 'expired' | 'revoked' | 'pending';

/**
 * Registry reporting status
 */
export type RegistryStatus =
  | 'pending'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'error';

/**
 * Vaccine inventory item
 */
export interface Vaccine {
  id: string;
  cvxCode: string; // CDC CVX code
  mvxCode?: string; // Manufacturer code
  vaccineName: string;
  brandName?: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: Date;

  // Storage requirements
  storageType: VaccineStorageType;
  storageUnitId?: string;
  tempRangeMinC: number;
  tempRangeMaxC: number;
  binLocation: string;

  // Packaging
  dosesPerVial: number;
  diluentRequired: boolean;
  diluentLotNumber?: string;
  diluentExpirationDate?: Date;
  multiDoseVial: boolean;
  beyondUseDate?: Date; // After opening (multi-dose)

  // Inventory
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity: number;

  // VFC
  vfcEligible: boolean;
  fundingSource?: 'private' | 'vfc' | 'state' | '317';

  // NDC for billing
  ndcCode?: string;
  cptCode?: string;

  // Status
  isActive: boolean;
  onHold: boolean;
  holdReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Immunization record
 */
export interface ImmunizationRecord {
  id: string;
  patientId: string;
  vaccineId: string;

  // Vaccine details (denormalized for historical accuracy)
  vaccineName: string;
  cvxCode: string;
  mvxCode?: string;
  lotNumber: string;
  expirationDate: Date;
  manufacturer: string;
  ndcCode?: string;

  // Administration details
  administeredBy: string;
  administeredByName: string;
  administeredByCredential: string;
  administeredAt: Date;
  administrationSite: AdministrationSite;
  administrationRoute: AdministrationRoute;
  doseAmount: number;
  doseUnit: string;
  doseNumber: number; // 1st, 2nd, booster, etc.
  seriesComplete: boolean;

  // Standing order
  standingOrderId?: string;
  standingOrderName?: string;
  protocolUsed?: string;

  // Supervising prescriber (for interns)
  supervisorId?: string;
  supervisorName?: string;
  supervisorNPI?: string;

  // Consent
  consentObtained: boolean;
  consentSignature?: string;
  consentDate?: Date;
  guardianName?: string; // For minors

  // VIS (Vaccine Information Statement)
  visProvided: boolean;
  visDate: Date;
  visVersion: string;
  visLanguage: string;

  // VFC
  vfcEligible: boolean;
  vfcEligibilityReason?: VFCEligibilityReason;
  fundingSource: 'private' | 'vfc' | 'state' | '317';

  // Observation period
  observationRequired: boolean;
  observationMinutes?: number;
  observationCompletedAt?: Date;
  adverseReaction: boolean;
  reactionDetails?: string;

  // Registry reporting
  registryReportingRequired: boolean;
  registryState: string;
  registryStatus: RegistryStatus;
  registrySubmittedAt?: Date;
  registryResponseId?: string;
  registryErrors?: string[];

  // Billing
  billingCode?: string;
  administrationFee?: number;
  billed: boolean;
  billedAt?: Date;

  // Status
  status: 'completed' | 'void' | 'error';
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Standing order
 */
export interface StandingOrder {
  id: string;
  vaccineName: string;
  cvxCode: string;
  protocolName: string;

  // Authorization
  authorizedBy: string; // Physician name
  authorizedByNPI: string;
  authorizedByDEA?: string;
  effectiveDate: Date;
  expirationDate: Date;
  status: StandingOrderStatus;

  // Eligibility criteria
  minAge: number; // In months
  maxAge?: number;
  genderRestriction?: 'M' | 'F' | 'all';
  conditions?: string[];
  contraindications: string[];
  precautions: string[];

  // Dosing
  dosing: {
    amount: number;
    unit: string;
    route: AdministrationRoute;
    site: AdministrationSite;
    seriesDoses?: number;
    intervalDays?: number;
  };

  // Screening requirements
  screeningQuestions: ScreeningQuestion[];

  // Observation
  observationRequired: boolean;
  observationMinutes: number;

  // VIS requirements
  visRequired: boolean;
  visVersion: string;

  // Pharmacy/State
  pharmacyId: string;
  state: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Screening question
 */
export interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'yes_no' | 'date' | 'text' | 'multiple_choice';
  options?: string[];
  requiresYes?: boolean;
  requiresNo?: boolean;
  contraindication: boolean;
  precaution: boolean;
  notes?: string;
}

/**
 * Screening response
 */
export interface ScreeningResponse {
  questionId: string;
  question: string;
  response: string | boolean | Date;
  passedScreening: boolean;
  notes?: string;
}

/**
 * Vaccine storage unit
 */
export interface VaccineStorageUnit {
  id: string;
  unitName: string;
  unitType: VaccineStorageType;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  // Temperature monitoring (CDC DDL requirement)
  currentTempC: number;
  lastReadingAt: Date;
  minTemp24hC: number;
  maxTemp24hC: number;

  // Alert thresholds
  alertThresholdMinC: number;
  alertThresholdMaxC: number;
  alertRecipients: string[];

  // Excursion tracking
  excursionActive: boolean;
  excursionStartAt?: Date;
  excursionEndAt?: Date;
  excursionMinTempC?: number;
  excursionMaxTempC?: number;
  excursionDurationMinutes?: number;
  excursionAction?: string;

  // Monitoring device
  monitoringDeviceId?: string;
  monitoringDeviceType?: 'digital_data_logger' | 'min_max_thermometer' | 'continuous';
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;

  // Status
  isActive: boolean;
  isOperational: boolean;
  maintenanceRequired: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Temperature log entry
 */
export interface TemperatureLogEntry {
  id: string;
  storageUnitId: string;
  temperatureC: number;
  recordedAt: Date;
  recordedBy?: string;
  isAutomatic: boolean;
  isExcursion: boolean;
  notes?: string;
}

/**
 * IIS (Immunization Information System) submission
 */
export interface IISSubmission {
  id: string;
  immunizationId: string;
  registryState: string;
  registryEndpoint?: string;

  // Submission details
  submittedAt: Date;
  submittedBy: string;
  messageId: string;
  messageFormat: 'HL7_251' | 'FHIR';

  // Response
  responseReceivedAt?: Date;
  responseStatus?: 'AA' | 'AE' | 'AR'; // Accept, Error, Reject
  responseMessage?: string;
  responseErrors?: string[];

  // Retry tracking
  attemptCount: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;

  status: RegistryStatus;
}

/**
 * Immunization schedule recommendation
 */
export interface ImmunizationRecommendation {
  vaccineType: string;
  cvxCode: string;
  dueDate: Date;
  minDate: Date;
  maxDate?: Date;
  doseNumber: number;
  priority: 'routine' | 'catch_up' | 'high_risk';
  reason: string;
}

// ============================================
// SCHEMAS
// ============================================

export const VaccineSchema = z.object({
  id: z.string(),
  cvxCode: z.string(),
  mvxCode: z.string().optional(),
  vaccineName: z.string(),
  brandName: z.string().optional(),
  manufacturer: z.string(),
  lotNumber: z.string(),
  expirationDate: z.date(),
  storageType: z.enum(['refrigerated', 'frozen', 'ultra_cold', 'room_temp']),
  storageUnitId: z.string().optional(),
  tempRangeMinC: z.number(),
  tempRangeMaxC: z.number(),
  binLocation: z.string(),
  dosesPerVial: z.number().positive(),
  diluentRequired: z.boolean(),
  multiDoseVial: z.boolean(),
  quantityOnHand: z.number().min(0),
  quantityAllocated: z.number().min(0),
  quantityAvailable: z.number().min(0),
  reorderPoint: z.number().min(0),
  reorderQuantity: z.number().min(0),
  vfcEligible: z.boolean(),
  ndcCode: z.string().optional(),
  cptCode: z.string().optional(),
  isActive: z.boolean(),
  onHold: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ImmunizationRecordSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  vaccineId: z.string(),
  vaccineName: z.string(),
  cvxCode: z.string(),
  lotNumber: z.string(),
  expirationDate: z.date(),
  manufacturer: z.string(),
  administeredBy: z.string(),
  administeredByName: z.string(),
  administeredByCredential: z.string(),
  administeredAt: z.date(),
  administrationSite: z.enum([
    'left_deltoid',
    'right_deltoid',
    'left_vastus_lateralis',
    'right_vastus_lateralis',
    'left_gluteal',
    'right_gluteal',
    'oral',
    'nasal',
    'other',
  ]),
  administrationRoute: z.enum([
    'intramuscular',
    'subcutaneous',
    'intradermal',
    'oral',
    'nasal',
    'inhalation',
  ]),
  doseAmount: z.number().positive(),
  doseUnit: z.string(),
  doseNumber: z.number().positive(),
  seriesComplete: z.boolean(),
  consentObtained: z.boolean(),
  visProvided: z.boolean(),
  visDate: z.date(),
  visVersion: z.string(),
  vfcEligible: z.boolean(),
  fundingSource: z.enum(['private', 'vfc', 'state', '317']),
  observationRequired: z.boolean(),
  adverseReaction: z.boolean(),
  registryReportingRequired: z.boolean(),
  registryState: z.string(),
  registryStatus: z.enum(['pending', 'submitted', 'accepted', 'rejected', 'error']),
  status: z.enum(['completed', 'void', 'error']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const StandingOrderSchema = z.object({
  id: z.string(),
  vaccineName: z.string(),
  cvxCode: z.string(),
  protocolName: z.string(),
  authorizedBy: z.string(),
  authorizedByNPI: z.string().length(10),
  effectiveDate: z.date(),
  expirationDate: z.date(),
  status: z.enum(['active', 'expired', 'revoked', 'pending']),
  minAge: z.number().min(0),
  maxAge: z.number().optional(),
  contraindications: z.array(z.string()),
  precautions: z.array(z.string()),
  dosing: z.object({
    amount: z.number().positive(),
    unit: z.string(),
    route: z.enum([
      'intramuscular',
      'subcutaneous',
      'intradermal',
      'oral',
      'nasal',
      'inhalation',
    ]),
    site: z.enum([
      'left_deltoid',
      'right_deltoid',
      'left_vastus_lateralis',
      'right_vastus_lateralis',
      'left_gluteal',
      'right_gluteal',
      'oral',
      'nasal',
      'other',
    ]),
  }),
  observationRequired: z.boolean(),
  observationMinutes: z.number().min(0),
  visRequired: z.boolean(),
  visVersion: z.string(),
  pharmacyId: z.string(),
  state: z.string().length(2),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VaccineStorageUnitSchema = z.object({
  id: z.string(),
  unitName: z.string(),
  unitType: z.enum(['refrigerated', 'frozen', 'ultra_cold', 'room_temp']),
  location: z.string(),
  currentTempC: z.number(),
  lastReadingAt: z.date(),
  minTemp24hC: z.number(),
  maxTemp24hC: z.number(),
  alertThresholdMinC: z.number(),
  alertThresholdMaxC: z.number(),
  excursionActive: z.boolean(),
  isActive: z.boolean(),
  isOperational: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CONSTANTS
// ============================================

/**
 * Standard storage temperature ranges (Celsius)
 */
export const STORAGE_TEMP_RANGES: Record<
  VaccineStorageType,
  { min: number; max: number; description: string }
> = {
  refrigerated: { min: 2, max: 8, description: '2-8°C (36-46°F)' },
  frozen: { min: -50, max: -15, description: '-50 to -15°C (-58 to 5°F)' },
  ultra_cold: { min: -90, max: -60, description: '-90 to -60°C (-130 to -76°F)' },
  room_temp: { min: 15, max: 25, description: '15-25°C (59-77°F)' },
};

/**
 * Administration route display names
 */
export const ROUTE_NAMES: Record<AdministrationRoute, string> = {
  intramuscular: 'Intramuscular (IM)',
  subcutaneous: 'Subcutaneous (SC)',
  intradermal: 'Intradermal (ID)',
  oral: 'Oral (PO)',
  nasal: 'Nasal (IN)',
  inhalation: 'Inhalation',
};

/**
 * Administration site display names
 */
export const SITE_NAMES: Record<AdministrationSite, string> = {
  left_deltoid: 'Left Deltoid',
  right_deltoid: 'Right Deltoid',
  left_vastus_lateralis: 'Left Vastus Lateralis (Thigh)',
  right_vastus_lateralis: 'Right Vastus Lateralis (Thigh)',
  left_gluteal: 'Left Gluteal',
  right_gluteal: 'Right Gluteal',
  oral: 'Oral',
  nasal: 'Nasal',
  other: 'Other',
};

/**
 * Common CVX codes
 */
export const COMMON_CVX_CODES: Record<string, { name: string; series?: number }> = {
  '03': { name: 'MMR', series: 2 },
  '08': { name: 'Hepatitis B', series: 3 },
  '10': { name: 'IPV (Polio)', series: 4 },
  '20': { name: 'DTaP', series: 5 },
  '21': { name: 'Varicella', series: 2 },
  '33': { name: 'Pneumococcal Polysaccharide (PPSV23)' },
  '49': { name: 'Hib', series: 4 },
  '83': { name: 'Hepatitis A', series: 2 },
  '88': { name: 'Influenza (Unspecified)' },
  '94': { name: 'MMR-Varicella (MMRV)', series: 2 },
  '115': { name: 'Tdap' },
  '133': { name: 'Pneumococcal Conjugate (PCV13)' },
  '140': { name: 'Influenza (High Dose)' },
  '141': { name: 'Influenza (Quadrivalent)' },
  '150': { name: 'Influenza (Preservative Free)' },
  '158': { name: 'Influenza (Egg Free)' },
  '165': { name: 'HPV (9-valent)', series: 3 },
  '187': { name: 'Zoster (Recombinant - Shingrix)', series: 2 },
  '197': { name: 'Influenza (High Dose Quadrivalent)' },
  '207': { name: 'COVID-19 mRNA (Moderna)', series: 2 },
  '208': { name: 'COVID-19 mRNA (Pfizer)', series: 2 },
  '210': { name: 'COVID-19 (AstraZeneca)', series: 2 },
  '211': { name: 'COVID-19 (Novavax)', series: 2 },
  '212': { name: 'COVID-19 (J&J)', series: 1 },
  '218': { name: 'COVID-19 Bivalent (Pfizer)', series: 1 },
  '219': { name: 'COVID-19 Bivalent (Moderna)', series: 1 },
  '229': { name: 'COVID-19 XBB (Pfizer)', series: 1 },
  '230': { name: 'COVID-19 XBB (Moderna)', series: 1 },
  '300': { name: 'RSV (Arexvy)', series: 1 },
  '301': { name: 'RSV (Abrysvo)', series: 1 },
};

/**
 * Standard observation periods (minutes)
 */
export const OBSERVATION_PERIODS = {
  default: 15,
  firstDose: 15,
  allergyHistory: 30,
  anaphylaxisHistory: 30,
  covid: 15,
  covidJ_J: 15,
};

/**
 * VFC eligibility descriptions
 */
export const VFC_ELIGIBILITY_DESCRIPTIONS: Record<VFCEligibilityReason, string> = {
  medicaid: 'Enrolled in Medicaid',
  uninsured: 'Has no health insurance',
  american_indian_alaska_native: 'American Indian or Alaska Native',
  underinsured: 'Has insurance that does not cover vaccines (Federally Qualified Health Centers only)',
  not_eligible: 'Not eligible for VFC program',
};

/**
 * IIS reporting hours requirement by state (example)
 */
export const IIS_REPORTING_HOURS: Record<string, number> = {
  CA: 24,
  NY: 24,
  TX: 72,
  FL: 24,
  DEFAULT: 72,
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Generate vaccine ID
 */
export function generateVaccineId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `VAX-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate immunization record ID
 */
export function generateImmunizationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `IMM-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate standing order ID
 */
export function generateStandingOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `SO-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if vaccine is expired
 */
export function isVaccineExpired(vaccine: Vaccine): boolean {
  return vaccine.expirationDate < new Date();
}

/**
 * Check if vaccine is expiring soon
 */
export function isVaccineExpiringSoon(
  vaccine: Vaccine,
  daysThreshold: number = 30
): boolean {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return vaccine.expirationDate <= thresholdDate;
}

/**
 * Check if multi-dose vial is beyond use date
 */
export function isBeyondUseDate(vaccine: Vaccine): boolean {
  if (!vaccine.multiDoseVial || !vaccine.beyondUseDate) {
    return false;
  }
  return vaccine.beyondUseDate < new Date();
}

/**
 * Calculate beyond use date for multi-dose vial
 */
export function calculateBeyondUseDate(
  openedAt: Date,
  beyondUseDays: number = 28
): Date {
  const budDate = new Date(openedAt);
  budDate.setDate(budDate.getDate() + beyondUseDays);
  return budDate;
}

/**
 * Check if temperature is within range
 */
export function isTemperatureInRange(
  tempC: number,
  storageType: VaccineStorageType
): boolean {
  const range = STORAGE_TEMP_RANGES[storageType];
  return tempC >= range.min && tempC <= range.max;
}

/**
 * Check for temperature excursion
 */
export function checkTemperatureExcursion(
  tempC: number,
  storageType: VaccineStorageType
): { excursion: boolean; severity: 'none' | 'warning' | 'critical'; message: string } {
  const range = STORAGE_TEMP_RANGES[storageType];

  if (tempC >= range.min && tempC <= range.max) {
    return { excursion: false, severity: 'none', message: 'Temperature within range' };
  }

  // Calculate deviation
  const deviation =
    tempC < range.min
      ? range.min - tempC
      : tempC - range.max;

  // Critical if more than 5°C out of range
  const severity = deviation > 5 ? 'critical' : 'warning';

  const message =
    tempC < range.min
      ? `Temperature too cold: ${tempC}°C (min: ${range.min}°C)`
      : `Temperature too warm: ${tempC}°C (max: ${range.max}°C)`;

  return { excursion: true, severity, message };
}

/**
 * Create vaccine inventory item
 */
export function createVaccine(
  data: Omit<Vaccine, 'id' | 'quantityAvailable' | 'createdAt' | 'updatedAt'>
): Vaccine {
  const now = new Date();
  return {
    id: generateVaccineId(),
    ...data,
    quantityAvailable: data.quantityOnHand - data.quantityAllocated,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update vaccine quantity
 */
export function updateVaccineQuantity(
  vaccine: Vaccine,
  change: number,
  reason: 'administered' | 'received' | 'wasted' | 'expired' | 'adjustment'
): Vaccine {
  const newQuantity = vaccine.quantityOnHand + change;
  if (newQuantity < 0) {
    throw new Error('Cannot reduce quantity below zero');
  }

  return {
    ...vaccine,
    quantityOnHand: newQuantity,
    quantityAvailable: newQuantity - vaccine.quantityAllocated,
    updatedAt: new Date(),
  };
}

/**
 * Allocate vaccine for administration
 */
export function allocateVaccine(vaccine: Vaccine, quantity: number = 1): Vaccine {
  if (quantity > vaccine.quantityAvailable) {
    throw new Error('Insufficient vaccine quantity available');
  }

  return {
    ...vaccine,
    quantityAllocated: vaccine.quantityAllocated + quantity,
    quantityAvailable: vaccine.quantityAvailable - quantity,
    updatedAt: new Date(),
  };
}

/**
 * Deallocate vaccine (if not used)
 */
export function deallocateVaccine(vaccine: Vaccine, quantity: number = 1): Vaccine {
  if (quantity > vaccine.quantityAllocated) {
    throw new Error('Cannot deallocate more than allocated');
  }

  return {
    ...vaccine,
    quantityAllocated: vaccine.quantityAllocated - quantity,
    quantityAvailable: vaccine.quantityAvailable + quantity,
    updatedAt: new Date(),
  };
}

/**
 * Check standing order eligibility
 */
export function checkStandingOrderEligibility(
  order: StandingOrder,
  patientAgeMonths: number,
  patientGender: 'M' | 'F',
  screeningResponses: ScreeningResponse[]
): { eligible: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Check order status
  if (order.status !== 'active') {
    reasons.push(`Standing order is ${order.status}`);
    return { eligible: false, reasons, warnings };
  }

  // Check expiration
  if (order.expirationDate < new Date()) {
    reasons.push('Standing order has expired');
    return { eligible: false, reasons, warnings };
  }

  // Check age
  if (patientAgeMonths < order.minAge) {
    reasons.push(`Patient age (${patientAgeMonths} months) below minimum (${order.minAge} months)`);
  }
  if (order.maxAge && patientAgeMonths > order.maxAge) {
    reasons.push(`Patient age (${patientAgeMonths} months) above maximum (${order.maxAge} months)`);
  }

  // Check gender restriction
  if (order.genderRestriction && order.genderRestriction !== 'all') {
    if (order.genderRestriction !== patientGender) {
      reasons.push(`Vaccine restricted to gender: ${order.genderRestriction}`);
    }
  }

  // Check screening responses
  for (const response of screeningResponses) {
    if (!response.passedScreening) {
      const question = order.screeningQuestions.find((q) => q.id === response.questionId);
      if (question?.contraindication) {
        reasons.push(`Contraindication: ${question.question}`);
      } else if (question?.precaution) {
        warnings.push(`Precaution: ${question.question}`);
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    warnings,
  };
}

/**
 * Create immunization record
 */
export function createImmunizationRecord(
  data: Omit<ImmunizationRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): ImmunizationRecord {
  const now = new Date();
  return {
    id: generateImmunizationId(),
    ...data,
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Void immunization record
 */
export function voidImmunizationRecord(
  record: ImmunizationRecord,
  voidedBy: string,
  reason: string
): ImmunizationRecord {
  return {
    ...record,
    status: 'void',
    voidReason: reason,
    voidedBy,
    voidedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check if registry reporting is required
 */
export function isRegistryReportingRequired(state: string): boolean {
  // All states require IIS reporting for pharmacies
  return true;
}

/**
 * Get IIS reporting deadline
 */
export function getIISReportingDeadline(
  administeredAt: Date,
  state: string
): Date {
  const hours = IIS_REPORTING_HOURS[state] ?? IIS_REPORTING_HOURS['DEFAULT'] ?? 72;
  const deadline = new Date(administeredAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Check if IIS submission is overdue
 */
export function isIISSubmissionOverdue(
  administeredAt: Date,
  state: string
): boolean {
  const deadline = getIISReportingDeadline(administeredAt, state);
  return new Date() > deadline;
}

/**
 * Check VFC eligibility
 */
export function checkVFCEligibility(
  hasInsurance: boolean,
  hasMedicaid: boolean,
  isAmericanIndianAlaskaNative: boolean,
  isUnderinsured: boolean,
  isFQHC: boolean
): { eligible: boolean; reason: VFCEligibilityReason } {
  // VFC eligibility hierarchy
  if (hasMedicaid) {
    return { eligible: true, reason: 'medicaid' };
  }
  if (!hasInsurance) {
    return { eligible: true, reason: 'uninsured' };
  }
  if (isAmericanIndianAlaskaNative) {
    return { eligible: true, reason: 'american_indian_alaska_native' };
  }
  if (isUnderinsured && isFQHC) {
    return { eligible: true, reason: 'underinsured' };
  }
  return { eligible: false, reason: 'not_eligible' };
}

/**
 * Calculate recommended observation period
 */
export function calculateObservationPeriod(
  isFirstDose: boolean,
  hasAllergyHistory: boolean,
  hasAnaphylaxisHistory: boolean,
  cvxCode?: string
): number {
  if (hasAnaphylaxisHistory) {
    return OBSERVATION_PERIODS.anaphylaxisHistory;
  }
  if (hasAllergyHistory) {
    return OBSERVATION_PERIODS.allergyHistory;
  }
  if (cvxCode && ['207', '208', '212', '218', '219', '229', '230'].includes(cvxCode)) {
    return OBSERVATION_PERIODS.covid;
  }
  if (isFirstDose) {
    return OBSERVATION_PERIODS.firstDose;
  }
  return OBSERVATION_PERIODS.default;
}

/**
 * Create storage unit
 */
export function createStorageUnit(
  data: Omit<VaccineStorageUnit, 'id' | 'createdAt' | 'updatedAt'>
): VaccineStorageUnit {
  const now = new Date();
  return {
    id: `STU-${Date.now().toString(36)}`.toUpperCase(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Log temperature reading
 */
export function createTemperatureLog(
  storageUnitId: string,
  temperatureC: number,
  storageType: VaccineStorageType,
  recordedBy?: string,
  isAutomatic: boolean = false
): TemperatureLogEntry {
  const excursion = checkTemperatureExcursion(temperatureC, storageType);

  return {
    id: `TMP-${Date.now().toString(36)}`.toUpperCase(),
    storageUnitId,
    temperatureC,
    recordedAt: new Date(),
    recordedBy,
    isAutomatic,
    isExcursion: excursion.excursion,
    notes: excursion.excursion ? excursion.message : undefined,
  };
}

/**
 * Get vaccines requiring reorder
 */
export function getVaccinesNeedingReorder(vaccines: Vaccine[]): Vaccine[] {
  return vaccines.filter(
    (v) =>
      v.isActive &&
      !v.onHold &&
      !isVaccineExpired(v) &&
      v.quantityAvailable <= v.reorderPoint
  );
}

/**
 * Get expiring vaccines
 */
export function getExpiringVaccines(
  vaccines: Vaccine[],
  daysThreshold: number = 30
): Vaccine[] {
  return vaccines.filter(
    (v) => v.isActive && !isVaccineExpired(v) && isVaccineExpiringSoon(v, daysThreshold)
  );
}

/**
 * Get standing orders expiring soon
 */
export function getExpiringStandingOrders(
  orders: StandingOrder[],
  daysThreshold: number = 30
): StandingOrder[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return orders.filter(
    (o) =>
      o.status === 'active' &&
      o.expirationDate <= thresholdDate
  );
}

/**
 * Format immunization record for VIS
 */
export function formatForVIS(record: ImmunizationRecord): string {
  const lines: string[] = [];

  lines.push('VACCINE INFORMATION');
  lines.push('-'.repeat(40));
  lines.push(`Vaccine: ${record.vaccineName}`);
  lines.push(`CVX Code: ${record.cvxCode}`);
  lines.push(`Manufacturer: ${record.manufacturer}`);
  lines.push(`Lot Number: ${record.lotNumber}`);
  lines.push(`Expiration Date: ${record.expirationDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('ADMINISTRATION');
  lines.push('-'.repeat(40));
  lines.push(`Date/Time: ${record.administeredAt.toLocaleString()}`);
  lines.push(`Site: ${SITE_NAMES[record.administrationSite]}`);
  lines.push(`Route: ${ROUTE_NAMES[record.administrationRoute]}`);
  lines.push(`Dose: ${record.doseAmount} ${record.doseUnit}`);
  lines.push(`Dose Number: ${record.doseNumber}`);
  lines.push('');
  lines.push('ADMINISTERED BY');
  lines.push('-'.repeat(40));
  lines.push(`Name: ${record.administeredByName}`);
  lines.push(`Credential: ${record.administeredByCredential}`);
  lines.push('');
  lines.push('VIS PROVIDED');
  lines.push('-'.repeat(40));
  lines.push(`Version: ${record.visVersion}`);
  lines.push(`Date Given: ${record.visDate.toLocaleDateString()}`);

  return lines.join('\n');
}

/**
 * Get immunization history summary
 */
export function getImmunizationSummary(
  records: ImmunizationRecord[]
): Record<string, { doses: number; lastDate: Date; complete: boolean }> {
  const summary: Record<string, { doses: number; lastDate: Date; complete: boolean }> = {};

  for (const record of records) {
    if (record.status !== 'completed') continue;

    const key = record.cvxCode;
    if (!summary[key]) {
      summary[key] = {
        doses: 0,
        lastDate: record.administeredAt,
        complete: record.seriesComplete,
      };
    }

    summary[key].doses++;
    if (record.administeredAt > summary[key].lastDate) {
      summary[key].lastDate = record.administeredAt;
      summary[key].complete = record.seriesComplete;
    }
  }

  return summary;
}
