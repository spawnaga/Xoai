/**
 * Long-Term Care (LTC) Facility Module
 *
 * Handles facility management, chart orders, medication administration
 * records (MAR), and institutional pharmacy operations.
 */

import { z } from 'zod';

// ============================================
// FACILITY TYPES
// ============================================

export type FacilityType =
  | 'SNF' // Skilled Nursing Facility
  | 'ALF' // Assisted Living Facility
  | 'ICF' // Intermediate Care Facility
  | 'HOSPICE' // Hospice Care
  | 'REHAB' // Rehabilitation Center
  | 'MEMORY_CARE' // Memory Care / Dementia Unit
  | 'GROUP_HOME' // Residential Care Home
  | 'HOSPITAL' // Hospital
  | 'LTACH'; // Long-Term Acute Care Hospital

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  npi?: string;
  deaNumber?: string;
  licenseNumber: string;
  address: Address;
  phone: string;
  fax: string;
  email?: string;
  administrator: string;
  directorOfNursing?: string;
  medicalDirector?: string;
  consultantPharmacistId?: string;
  pharmacyId: string; // Contracted pharmacy
  billingType: BillingType;
  deliverySchedule: DeliverySchedule;
  emergencyKitLocation?: string;
  bedCount: number;
  currentCensus?: number;
  units: FacilityUnit[];
  contractStartDate: Date;
  contractEndDate?: Date;
  status: 'active' | 'inactive' | 'pending';
  preferences: FacilityPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type BillingType = 'facility' | 'patient' | 'mixed';

export interface DeliverySchedule {
  regularDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  regularTime: string; // e.g., "14:00"
  statDeliveryAvailable: boolean;
  cutoffTime: string; // Orders after this time go to next delivery
  weekendDelivery: boolean;
  holidayDelivery: boolean;
}

export interface FacilityUnit {
  id: string;
  name: string;
  type: 'general' | 'memory_care' | 'skilled' | 'rehab' | 'hospice';
  bedCount: number;
  nurseStationPhone?: string;
}

export interface FacilityPreferences {
  defaultPackaging: 'unit_dose' | 'blister_card' | 'vial' | 'mixed';
  labelFormat: 'standard' | 'large_print' | 'barcode_enhanced';
  marFormat: 'daily' | 'weekly' | 'monthly';
  eMarEnabled: boolean;
  autoRefillEnabled: boolean;
  requiresFacilityApproval: boolean;
  allowsEmergencyKit: boolean;
  controlledSubstanceProtocol: 'standard' | 'enhanced';
}

// ============================================
// RESIDENT/PATIENT TYPES
// ============================================

export interface FacilityResident {
  id: string;
  facilityId: string;
  unitId?: string;
  roomNumber: string;
  bedNumber?: string;
  patientId: string; // Link to main patient record
  admissionDate: Date;
  dischargeDate?: Date;
  status: 'active' | 'discharged' | 'hospital' | 'leave_of_absence' | 'deceased';
  attendingPhysicianId: string;
  primaryDiagnosis: string;
  diagnoses: string[];
  dietaryRestrictions?: string[];
  allergies: string[];
  codeStatus: 'full_code' | 'dnr' | 'dni' | 'dnr_dni' | 'comfort_care';
  specialInstructions?: string;
  emergencyContact: EmergencyContact;
  insuranceInfo: ResidentInsurance;
  medicarePartADays?: number;
  medicarePartACoveredUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  isPowerOfAttorney: boolean;
  isHealthcareProxy: boolean;
}

export interface ResidentInsurance {
  primaryType: 'medicare_a' | 'medicare_d' | 'medicaid' | 'private' | 'hospice' | 'self_pay';
  primaryInsuranceId?: string;
  secondaryType?: string;
  secondaryInsuranceId?: string;
  hospiceBenefitActive?: boolean;
  hospiceProvider?: string;
}

// ============================================
// CHART ORDER TYPES
// ============================================

export interface ChartOrder {
  id: string;
  facilityId: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  prescriberId: string;
  prescriberName: string;
  orderType: ChartOrderType;
  status: ChartOrderStatus;
  orderDate: Date;
  startDate: Date;
  endDate?: Date;
  medications: ChartOrderMedication[];
  orderSource: 'phone' | 'fax' | 'electronic' | 'verbal';
  nurseInitials?: string;
  pharmacistVerified: boolean;
  pharmacistId?: string;
  verifiedAt?: Date;
  discontinuedAt?: Date;
  discontinuedBy?: string;
  discontinueReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChartOrderType =
  | 'admission'
  | 'new_order'
  | 'reorder'
  | 'change'
  | 'discontinue'
  | 'hold'
  | 'resume'
  | 'transfer'
  | 'discharge';

export type ChartOrderStatus = 'pending' | 'verified' | 'processing' | 'filled' | 'delivered' | 'cancelled';

export interface ChartOrderMedication {
  id: string;
  drugName: string;
  strength: string;
  dosageForm: string;
  ndc?: string;
  dose: string;
  route: string;
  frequency: string;
  administrationTimes: string[]; // e.g., ["08:00", "20:00"]
  prn: boolean;
  prnIndication?: string;
  maxDailyDose?: string;
  startDate: Date;
  endDate?: Date;
  durationDays?: number;
  quantity?: number;
  specialInstructions?: string;
  diagnosis?: string;
  icd10Code?: string;
  isControlled: boolean;
  deaSchedule?: string;
  requiresCrushing: boolean;
  crushingInstructions?: string;
  isHighAlert: boolean;
}

// ============================================
// MEDICATION ADMINISTRATION RECORD (MAR)
// ============================================

export interface MedicationAdministrationRecord {
  id: string;
  facilityId: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  startDate: Date;
  endDate: Date;
  medications: MARMedication[];
  generatedAt: Date;
  generatedBy: string;
}

export interface MARMedication {
  medicationId: string;
  drugName: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  administrationTimes: string[];
  prn: boolean;
  prnIndication?: string;
  specialInstructions?: string;
  administrationRecords: MARAdministration[];
}

export interface MARAdministration {
  date: Date;
  scheduledTime: string;
  actualTime?: string;
  status: MARStatus;
  administeredBy?: string;
  witnessedBy?: string; // For controlled substances
  notes?: string;
  vitalSigns?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    respirations?: number;
    oxygenSaturation?: number;
  };
  painLevel?: number; // 0-10 scale
}

export type MARStatus =
  | 'scheduled'
  | 'given'
  | 'held'
  | 'refused'
  | 'not_available'
  | 'self_administered'
  | 'not_given_other';

// ============================================
// EMERGENCY KIT
// ============================================

export interface EmergencyKit {
  id: string;
  facilityId: string;
  location: string;
  sealNumber: string;
  pharmacyId: string;
  lastInventoryDate: Date;
  lastSealedDate: Date;
  expirationDate: Date;
  status: 'sealed' | 'opened' | 'expired' | 'restock_needed';
  medications: EmergencyKitMedication[];
  accessLog: EmergencyKitAccess[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyKitMedication {
  ndc: string;
  drugName: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  unit: string;
  expirationDate: Date;
  isControlled: boolean;
  deaSchedule?: string;
  lotNumber?: string;
}

export interface EmergencyKitAccess {
  id: string;
  accessDate: Date;
  accessedBy: string;
  accessReason: string;
  residentName?: string;
  medicationUsed: string;
  quantityUsed: number;
  prescriberId?: string;
  prescriberName?: string;
  verbalOrderReceived: boolean;
  newSealNumber?: string;
  notes?: string;
}

// ============================================
// HOSPICE-SPECIFIC TYPES
// ============================================

export interface HospiceAdmission {
  id: string;
  residentId: string;
  hospiceProviderId: string;
  hospiceProviderName: string;
  terminalDiagnosis: string;
  terminalPrognosis: string; // e.g., "6 months or less"
  admissionDate: Date;
  dischargeDate?: Date;
  dischargeReason?: 'death' | 'revoked' | 'transferred' | 'decertified' | 'other';
  levelOfCare: HospiceLevelOfCare;
  comfortKitOrdered: boolean;
  comfortKitDeliveredDate?: Date;
  painManagementPlan?: string;
  symptomManagement: string[];
  dnrOnFile: boolean;
  advanceDirectivesReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type HospiceLevelOfCare =
  | 'routine_home_care'
  | 'continuous_home_care'
  | 'general_inpatient'
  | 'respite_care';

export interface ComfortKit {
  id: string;
  hospiceAdmissionId: string;
  residentId: string;
  kitType: 'standard' | 'pediatric' | 'custom';
  status: 'ordered' | 'filled' | 'delivered' | 'in_use' | 'returned';
  medications: ComfortKitMedication[];
  orderedDate: Date;
  filledDate?: Date;
  deliveredDate?: Date;
  returnedDate?: Date;
  notes?: string;
}

export interface ComfortKitMedication {
  drugName: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  indication: string; // e.g., "pain", "anxiety", "nausea"
  instructions: string;
  isControlled: boolean;
  deaSchedule?: string;
}

/**
 * Standard hospice comfort kit medications
 */
export const STANDARD_COMFORT_KIT: ComfortKitMedication[] = [
  {
    drugName: 'Morphine Sulfate',
    strength: '20mg/mL',
    dosageForm: 'Oral Solution',
    quantity: 30,
    indication: 'Pain, dyspnea',
    instructions: '5-10mg PO/SL q2-4h PRN pain or shortness of breath',
    isControlled: true,
    deaSchedule: 'II',
  },
  {
    drugName: 'Lorazepam',
    strength: '2mg/mL',
    dosageForm: 'Oral Solution',
    quantity: 10,
    indication: 'Anxiety, agitation',
    instructions: '0.5-2mg PO/SL q4-6h PRN anxiety',
    isControlled: true,
    deaSchedule: 'IV',
  },
  {
    drugName: 'Haloperidol',
    strength: '2mg/mL',
    dosageForm: 'Oral Solution',
    quantity: 10,
    indication: 'Delirium, agitation',
    instructions: '0.5-2mg PO q6-8h PRN agitation/delirium',
    isControlled: false,
  },
  {
    drugName: 'Prochlorperazine',
    strength: '25mg',
    dosageForm: 'Suppository',
    quantity: 12,
    indication: 'Nausea, vomiting',
    instructions: '25mg PR q6h PRN nausea/vomiting',
    isControlled: false,
  },
  {
    drugName: 'Hyoscyamine',
    strength: '0.125mg',
    dosageForm: 'Sublingual Tablet',
    quantity: 30,
    indication: 'Secretions',
    instructions: '0.125-0.25mg SL q4h PRN secretions',
    isControlled: false,
  },
  {
    drugName: 'Acetaminophen',
    strength: '650mg',
    dosageForm: 'Suppository',
    quantity: 12,
    indication: 'Pain, fever',
    instructions: '650mg PR q4-6h PRN pain/fever',
    isControlled: false,
  },
];

// ============================================
// CONSULTANT PHARMACIST SERVICES
// ============================================

export interface DrugRegimenReview {
  id: string;
  facilityId: string;
  residentId: string;
  residentName: string;
  reviewDate: Date;
  pharmacistId: string;
  pharmacistName: string;
  reviewType: 'monthly' | 'quarterly' | 'admission' | 'discharge' | 'change_in_condition';
  medicationsReviewed: number;
  findings: DRRFinding[];
  recommendationsCount: number;
  acceptedCount: number;
  status: 'pending' | 'completed' | 'reviewed_by_md';
  physicianReviewDate?: Date;
  physicianSignature?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DRRFinding {
  id: string;
  category: DRRFindingCategory;
  severity: 'critical' | 'significant' | 'moderate' | 'minor';
  medication?: string;
  finding: string;
  recommendation: string;
  clinicalRationale: string;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  physicianResponse?: string;
  responseDate?: Date;
}

export type DRRFindingCategory =
  | 'unnecessary_drug'
  | 'dose_adjustment'
  | 'drug_interaction'
  | 'adverse_reaction'
  | 'therapeutic_duplication'
  | 'monitoring_needed'
  | 'medication_error'
  | 'compliance_issue'
  | 'cost_savings'
  | 'formulary_alternative'
  | 'other';

// ============================================
// FACILITY FUNCTIONS
// ============================================

/**
 * Calculate if facility is due for delivery
 */
export function isDeliveryDay(
  schedule: DeliverySchedule,
  date: Date = new Date()
): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayOfWeek = dayNames[date.getDay()];
  return schedule.regularDays.includes(dayOfWeek);
}

/**
 * Get next delivery date
 */
export function getNextDeliveryDate(
  schedule: DeliverySchedule,
  fromDate: Date = new Date()
): Date {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const result = new Date(fromDate);

  // Check if we can still make today's delivery
  if (isDeliveryDay(schedule, result)) {
    const [hours, minutes] = schedule.cutoffTime.split(':').map(Number);
    const cutoff = new Date(result);
    cutoff.setHours(hours, minutes, 0, 0);

    if (result < cutoff) {
      return result;
    }
  }

  // Find next delivery day
  for (let i = 1; i <= 7; i++) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = dayNames[result.getDay()];
    if (schedule.regularDays.includes(dayOfWeek)) {
      return result;
    }
  }

  return result;
}

/**
 * Check if resident has active hospice benefit
 */
export function hasActiveHospiceBenefit(
  resident: FacilityResident,
  hospice?: HospiceAdmission
): boolean {
  if (resident.insuranceInfo.primaryType !== 'hospice') return false;
  if (!hospice) return false;
  if (hospice.dischargeDate) return false;
  return true;
}

/**
 * Generate MAR for a resident
 */
export function generateMAR(
  resident: FacilityResident,
  medications: ChartOrderMedication[],
  startDate: Date,
  days: number = 7
): MedicationAdministrationRecord {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);

  const marMedications: MARMedication[] = medications
    .filter(med => !med.endDate || med.endDate >= startDate)
    .map(med => {
      // Generate administration records for each scheduled time
      const records: MARAdministration[] = [];

      for (let day = 0; day < days; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);

        for (const time of med.administrationTimes) {
          records.push({
            date,
            scheduledTime: time,
            status: 'scheduled',
          });
        }
      }

      return {
        medicationId: med.id,
        drugName: med.drugName,
        strength: med.strength,
        dose: med.dose,
        route: med.route,
        frequency: med.frequency,
        administrationTimes: med.administrationTimes,
        prn: med.prn,
        prnIndication: med.prnIndication,
        specialInstructions: med.specialInstructions,
        administrationRecords: records,
      };
    });

  return {
    id: `MAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    facilityId: resident.facilityId,
    residentId: resident.id,
    residentName: '', // Would be populated from patient record
    roomNumber: resident.roomNumber,
    startDate,
    endDate,
    medications: marMedications,
    generatedAt: new Date(),
    generatedBy: 'System',
  };
}

/**
 * Check emergency kit status
 */
export function checkEmergencyKitStatus(kit: EmergencyKit): EmergencyKitCheck {
  const today = new Date();
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check if kit is sealed
  if (kit.status === 'opened') {
    issues.push('Emergency kit has been opened and needs restock/reseal');
  }

  // Check expiration
  if (kit.expirationDate < today) {
    issues.push('Emergency kit has expired medications');
  } else {
    const daysUntilExpiration = Math.ceil(
      (kit.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiration <= 30) {
      warnings.push(`Emergency kit medications expire in ${daysUntilExpiration} days`);
    }
  }

  // Check last inventory
  const daysSinceInventory = Math.ceil(
    (today.getTime() - kit.lastInventoryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceInventory > 30) {
    warnings.push(`Last inventory was ${daysSinceInventory} days ago`);
  }

  return {
    status: issues.length > 0 ? 'action_required' : warnings.length > 0 ? 'warning' : 'ok',
    issues,
    warnings,
    needsReseal: kit.status === 'opened',
    needsRestock: issues.some(i => i.includes('expired')),
    nextInventoryDue: new Date(kit.lastInventoryDate.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}

export interface EmergencyKitCheck {
  status: 'ok' | 'warning' | 'action_required';
  issues: string[];
  warnings: string[];
  needsReseal: boolean;
  needsRestock: boolean;
  nextInventoryDue: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const FacilitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SNF', 'ALF', 'ICF', 'HOSPICE', 'REHAB', 'MEMORY_CARE', 'GROUP_HOME', 'HOSPITAL', 'LTACH']),
  licenseNumber: z.string(),
  address: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string(),
    country: z.string().default('USA'),
  }),
  phone: z.string(),
  fax: z.string(),
  administrator: z.string(),
  pharmacyId: z.string().uuid(),
  billingType: z.enum(['facility', 'patient', 'mixed']),
  bedCount: z.number().positive(),
});

export const ChartOrderSchema = z.object({
  facilityId: z.string().uuid(),
  residentId: z.string().uuid(),
  prescriberId: z.string().uuid(),
  orderType: z.enum(['admission', 'new_order', 'reorder', 'change', 'discontinue', 'hold', 'resume', 'transfer', 'discharge']),
  startDate: z.date(),
  endDate: z.date().optional(),
  medications: z.array(z.object({
    drugName: z.string(),
    strength: z.string(),
    dosageForm: z.string(),
    dose: z.string(),
    route: z.string(),
    frequency: z.string(),
    administrationTimes: z.array(z.string()),
    prn: z.boolean(),
    prnIndication: z.string().optional(),
  })),
  orderSource: z.enum(['phone', 'fax', 'electronic', 'verbal']),
});

export const FacilityResidentSchema = z.object({
  facilityId: z.string().uuid(),
  patientId: z.string().uuid(),
  roomNumber: z.string(),
  admissionDate: z.date(),
  attendingPhysicianId: z.string().uuid(),
  primaryDiagnosis: z.string(),
  codeStatus: z.enum(['full_code', 'dnr', 'dni', 'dnr_dni', 'comfort_care']),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    isPowerOfAttorney: z.boolean(),
    isHealthcareProxy: z.boolean(),
  }),
});
