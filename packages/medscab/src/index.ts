/**
 * MedsCab - Medication Management Package
 *
 * Comprehensive medication management utilities for healthcare applications.
 * Features:
 * - Drug search with RxNorm integration
 * - Drug-drug interaction checking
 * - Allergy cross-reactivity detection
 * - Contraindication checking
 * - Drug Utilization Review (DUR)
 * - Dosing guidelines with patient-specific adjustments
 *
 * HIPAA Compliance:
 * - All PHI should be handled according to minimum necessary principle
 * - Audit logging should be implemented by the consuming application
 */

// Types
export type {
  Drug,
  DEASchedule,
  DrugSearchParams,
  DrugSearchResult,
  DrugInteraction,
  InteractionSeverity,
  InteractionCheckResult,
  Contraindication,
  ContraindicationCheckResult,
  AllergyAlert,
  AllergyCheckResult,
  DURAlert,
  DURAlertType,
  DURCheckInput,
  DURCheckResult,
  DosingGuidelinesInput,
  DosingGuideline,
  DosingGuidelinesResult,
  Prescription,
  PrescriptionStatus,
} from './types';

// Constants
export {
  DEAScheduleInfo,
  ALLERGY_CROSS_REACTIVITY,
} from './types';

// Validation schemas
export {
  DrugSearchParamsSchema,
  DURCheckInputSchema,
  PrescriptionCreateSchema,
  DosingGuidelinesInputSchema,
} from './types';

// Drug Search
export {
  searchDrugs,
  getDrugById,
  getDrugsByIds,
  isValidNDC,
} from './drug-search';

// Drug Interactions
export {
  checkDrugInteractions,
  checkContraindications,
  checkAllergies,
  comprehensiveSafetyCheck,
} from './drug-interactions';

// DUR Check
export {
  performDURCheck,
  quickDURCheck,
} from './dur-check';

// Dosing Guidelines
export {
  getDosingGuidelines,
  getStandardFrequencies,
  getStandardRoutes,
} from './dosing-guidelines';

// Insurance Claims Processing
export type {
  ClaimRequest,
  ClaimResponse,
  ClaimStatus,
  RejectCode,
  InsuranceInfo,
  PatientPayCalculation,
  EligibilityRequest,
  EligibilityResponse,
  ClaimReversal,
} from './claims';

export {
  submitClaim,
  reverseClaim,
  checkEligibility,
  calculatePatientPay,
  REJECT_CODES,
  DAW_CODES,
  getRejectCodeInfo,
  parseRejectCodes,
  ClaimRequestSchema,
  InsuranceInfoSchema,
} from './claims';

// Inventory Management
export type {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  StockOrder,
  OrderStatus,
  OrderItem,
  NDCComponents,
  ReorderItem,
  InventoryValuation,
  ExpiringItem,
  AdjustmentValidation,
  WholesalerId,
} from './inventory';

export {
  normalizeNDC,
  formatNDC,
  isValidNDCFormat,
  parseNDC,
  calculateAvailableQuantity,
  needsReorder,
  calculateOrderQuantity,
  isExpiringSoon,
  isExpired,
  generateReorderList,
  calculateInventoryValue,
  findExpiringInventory,
  createInventoryTransaction,
  validateAdjustment,
  WHOLESALERS,
  InventoryItemSchema,
  InventoryTransactionSchema,
  StockOrderSchema,
} from './inventory';

// Controlled Substances
export type {
  ControlledSubstanceRecord,
  CSTransactionType,
  CSReferenceType,
  DEA222Form,
  DEA222Item,
  DEA222Status,
  CSOSOrder,
  CSOSItem,
  CSOSStatus,
  CSRules,
  CSValidationResult,
  BiennialInventoryRecord,
  BiennialInventoryItem,
  VarianceResult,
  BiennialTimingResult,
  TheftLossReport,
  TheftLossItem,
  DEA106Summary,
} from './controlled-substances';

export {
  CS_RULES,
  isValidDEANumber,
  generateTestDEANumber,
  recordCSTransaction,
  validateCSDispensing,
  calculateVariance,
  validateBiennialInventoryTiming,
  requiresDeaReport,
  generateDea106Summary,
  ControlledSubstanceRecordSchema,
  TheftLossReportSchema,
} from './controlled-substances';

// Workflow Management
export type {
  WorkflowItem,
  WorkflowState,
  WorkflowPriority,
  WorkflowStateChange,
  QueueSummary,
  QueueThresholds,
  WaitTimeStats,
  PatientNotification,
  NotificationType,
  NotificationChannel,
  NotificationPreferences,
  NotificationData,
  NotificationCheck,
  WillCallBin,
  TransitionResult,
  InsuranceQueueStatus,
} from './workflow';

export {
  VALID_TRANSITIONS,
  DEFAULT_THRESHOLDS,
  calculateQueueSummary,
  getQueueColor,
  sortWorkflowItems,
  filterByState,
  filterByAssignee,
  calculateWaitTimeStats,
  isValidTransition,
  transitionState,
  generateNotificationMessage,
  shouldSendNotification,
  calculateReturnDate,
  getReadyForReturn,
  WorkflowItemSchema,
  NotificationPreferencesSchema,
} from './workflow';

// LTC/Facility Support
export type {
  Facility,
  FacilityType,
  Address,
  BillingType,
  DeliverySchedule,
  FacilityUnit,
  FacilityPreferences,
  FacilityResident,
  EmergencyContact,
  ResidentInsurance,
  ChartOrder,
  ChartOrderType,
  ChartOrderStatus,
  ChartOrderMedication,
  MedicationAdministrationRecord,
  MARMedication,
  MARAdministration,
  MARStatus,
  EmergencyKit,
  EmergencyKitMedication,
  EmergencyKitAccess,
  EmergencyKitCheck,
  HospiceAdmission,
  HospiceLevelOfCare,
  ComfortKit,
  ComfortKitMedication,
  DrugRegimenReview,
  DRRFinding,
  DRRFindingCategory,
} from './ltc-facility';

export {
  STANDARD_COMFORT_KIT,
  isDeliveryDay,
  getNextDeliveryDate,
  hasActiveHospiceBenefit,
  generateMAR,
  checkEmergencyKitStatus,
  FacilitySchema,
  FacilityResidentSchema,
  ChartOrderSchema,
} from './ltc-facility';

// Prescription Filling
export type {
  Fill,
  FillStatus,
  VerificationStatus,
  PackagingType,
  DeliveryMethod,
  DeliveryStatus,
  PartialFillReason,
  VerificationChecklist,
  VerificationResult,
  CounselingRecord,
  CounselingType,
  CounselingTopic,
  AuxiliaryLabel,
  LabelData,
  RefillEligibility,
  RefillDueInfo,
  FillValidation,
} from './fill';

export {
  AUXILIARY_LABELS,
  createFill,
  canRefill,
  validateFillForVerification,
  getRecommendedAuxiliaryLabels,
  calculateDaysUntilRefillDue,
  generateLabelData,
  FillSchema,
  VerificationChecklistSchema,
  CounselingRecordSchema,
} from './fill';
