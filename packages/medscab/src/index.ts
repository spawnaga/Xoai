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
  EligibilityResponse,
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

// AI-Assisted Data Entry
export type {
  AIModelProvider,
  OCRProvider,
  AIExtractionField,
  FieldAcceptanceStatus,
  AIFieldResult,
  AIInterpretation,
  FieldEntryStatus,
  DataEntrySession,
  DataEntryAuditEntry,
  OCRRequest,
  OCRResult,
  OCRWord,
  OCRBlock,
  AIExtractionRequest,
} from './ai-entry';

export {
  AI_EXTRACTION_FIELDS,
  REQUIRED_FIELDS,
  FIELD_DISPLAY_NAMES,
  CONFIDENCE_THRESHOLDS,
  IMAGE_QUALITY_THRESHOLDS,
  generateInterpretationId,
  generateSessionId,
  determineImageQuality,
  shouldAutoAcceptField,
  fieldNeedsConfirmation,
  validateFieldValue,
  createFieldResult,
  createInterpretation,
  createDataEntrySession,
  acceptAIValue,
  overrideFieldValue,
  rejectFieldValue,
  completeDataEntrySession,
  requestSupervisorApproval,
  approveBySuperviser,
  getFieldsNeedingAttention,
  getSessionStatistics,
  extractFinalValues,
  calculateAIAccuracy,
  AIFieldResultSchema,
  AIInterpretationSchema,
  DataEntrySessionSchema,
} from './ai-entry';

// Prescription Intake
export type {
  IntakeChannel,
  IntakeStatus,
  EScriptMessageType,
  ScriptVersion,
  PrescriberVerificationMethod,
  PatientIdentification,
  MedicationDetails,
  EPCSSignature,
  PrescriberInfo,
  PrescriberVerification,
  EScriptMessage,
  IntakeRecord,
  IntakeAuditEntry,
  IntakeProcessingResult,
  FaxIntakeOptions,
  PhoneIntakeOptions,
} from './intake';

export {
  INTAKE_CHANNEL_NAMES,
  ESCRIPT_MESSAGE_TYPE_NAMES,
  MIN_OCR_CONFIDENCE,
  EPCS_REQUIRED_SCHEDULES,
  generateIntakeId,
  createIntakeRecord,
  createIntakeFromEScript,
  createIntakeFromFax,
  createIntakeFromPhone,
  updateIntakeStatus,
  markIntakeProcessed,
  markIntakeRejected,
  isValidNPI,
  isValidDEANumber as isValidDEANumberIntake,
  canPrescribeControlled,
  verifyPrescriber,
  validateEPCSSignature,
  requiresManualReview,
  processIntakeRecord,
  calculateIntakeStatistics,
  filterIntakeRecords,
  sortIntakeRecordsByPriority,
  PatientIdentificationSchema,
  MedicationDetailsSchema,
  PrescriberInfoSchema,
  IntakeRecordSchema,
} from './intake';

// Prescription Transfer
export type {
  TransferDirection,
  TransferType,
  TransferStatus,
  TransferPharmacy,
  OriginalPrescriptionInfo,
  TransferRecord,
  TransferAuditEntry,
  TransferValidationResult,
  InboundTransferRequest,
  OutboundTransferRequest,
  TransferSummary,
} from './transfer';

export {
  NON_TRANSFERABLE_SCHEDULES_STRICT,
  ONE_TIME_TRANSFER_SCHEDULES,
  LIMITED_TRANSFER_SCHEDULES,
  MAX_TRANSFER_COUNT,
  TRANSFER_STATUS_NAMES,
  generateTransferId,
  canTransferControlledSubstance,
  validateTransferRequest,
  createInboundTransfer,
  createOutboundTransfer,
  updateTransferStatus,
  verifyTransfer,
  completeTransfer,
  cancelTransfer,
  rejectTransfer,
  generateTransferDocumentation,
  calculateTransferSummary,
  filterTransferRecords,
  sortTransferRecordsByDate,
  getPendingTransfers,
  isTransferWithinTimeWindow,
  getTransferTimeRemaining,
  TransferPharmacySchema,
  OriginalPrescriptionInfoSchema,
  TransferRecordSchema,
} from './transfer';

// PDMP Integration
export type {
  PDMPProvider,
  PDMPQueryReason,
  PaymentType,
  PDMPAlertType,
  PDMPAlertSeverity,
  PDMPQueryStatus,
  PDMPQuery,
  PDMPPrescription,
  PDMPAlert,
  PDMPResult,
  PDMPAuditEntry,
  MMECalculationInput,
  MMECalculationResult,
} from './pdmp';

export {
  PDMPQuerySchema,
  PDMPAlertSchema,
  PDMPResultSchema,
  PDMP_ALERT_INFO,
  MME_CONVERSION_FACTORS,
  MME_THRESHOLDS,
  PATTERN_THRESHOLDS,
  RISK_SCORE_WEIGHTS,
  generateQueryId,
  generateAlertId,
  calculateMME,
  calculateTotalDailyMME,
  detectOverlappingPrescriptions,
  countUniquePrescribers,
  countUniquePharmacies,
  countCashTransactions,
  detectEarlyRefills,
  createAlert,
  analyzeResults as analyzePDMPResults,
  createPDMPResult,
  acknowledgeAlert,
  markResultReviewed,
  isPDMPQueryRequired,
  formatPDMPSummary,
  filterByDateRange,
  filterBySchedule,
  filterByPrescriber,
  filterByPharmacy,
} from './pdmp';

// Pickup & Patient Verification
export type {
  PickupSessionType,
  PickupStatus,
  SignatureReason,
  IDType,
  CounselingStatus,
  RetailPickupSearch,
  OrganizationPickupSearch,
  PatientMatch,
  PickupPrescription,
  SignatureCapture,
  IDVerification,
  PickupSession,
  PickupAuditEntry,
  WillCallBinEnhanced,
  WillCallExpirationResult,
} from './pickup';

export {
  RetailPickupSearchSchema,
  OrganizationPickupSearchSchema,
  SignatureCaptureSchema,
  IDVerificationSchema,
  PickupSessionSchema,
  DEFAULT_RETURN_DAYS,
  SIGNATURE_EXPIRY_MONTHS,
  MIN_SEARCH_CHARS,
  SIGNATURE_REASONS_DISPLAY,
  ID_TYPE_NAMES,
  ID_REQUIRED_SCHEDULES,
  generateSessionId as generatePickupSessionId,
  generateSignatureId,
  generateVerificationId,
  validateRetailSearch,
  createPickupSession,
  selectPatient,
  scanPrescription,
  captureSignature,
  verifyPatientId,
  completeCounseling,
  recordPayment,
  completePickup,
  cancelPickup,
  isSignatureValid,
  calculateSignatureExpiration,
  createWillCallBin,
  updateWillCallDays,
  processWillCallExpiration,
  markWillCallReversed,
  markReminderSent,
  getReadyForReturn as getReadyForReturnBins,
  getExpiringSoon,
  matchPatients,
  maskIdNumber,
  formatPickupSummary,
} from './pickup';

// Role-Based Access Control (RBAC)
export type {
  PermissionLevel,
  PharmacyRoleId,
  PermissionCategory,
  PharmacyPermission,
  PharmacyRole,
  PharmacyStaff,
  PermissionCheckResult,
  SupervisionSession,
  RBACActionAudit,
} from './rbac';

export {
  PharmacyStaffSchema,
  SupervisionSessionSchema,
  PHARMACY_ROLES,
  PERMISSION_DESCRIPTIONS,
  STATE_TECH_RATIOS,
  getRole,
  getAllRoles,
  getRolesByLevel,
  getRolesWithPermission,
  roleHasPermission,
  hasPermission as hasPharmacyPermission,
  canSupervise,
  getTechRatio,
  isWithinTechRatio,
  createSupervisionSession,
  endSupervisionSession,
  logSupervisedAction,
  createPermissionAudit,
  getRolePermissions,
  getEffectivePermissions,
  hasAnyPermission as hasAnyPharmacyPermission,
  hasAllPermissions as hasAllPharmacyPermissions,
  getSupervisableRoles,
  isCertificationExpiringSoon,
  getExpiringCertifications,
  formatRoleDisplay,
  getPermissionCategory,
  groupPermissionsByCategory,
} from './rbac';

// Immunization Services
export type {
  VaccineStorageType,
  AdministrationRoute,
  AdministrationSite,
  VFCEligibilityReason,
  StandingOrderStatus,
  RegistryStatus,
  Vaccine,
  ImmunizationRecord,
  StandingOrder,
  ScreeningQuestion,
  ScreeningResponse,
  VaccineStorageUnit,
  TemperatureLogEntry,
  IISSubmission,
  ImmunizationRecommendation,
} from './immunization';

export {
  VaccineSchema,
  ImmunizationRecordSchema,
  StandingOrderSchema,
  VaccineStorageUnitSchema,
  STORAGE_TEMP_RANGES,
  ROUTE_NAMES,
  SITE_NAMES,
  COMMON_CVX_CODES,
  OBSERVATION_PERIODS,
  VFC_ELIGIBILITY_DESCRIPTIONS,
  IIS_REPORTING_HOURS,
  generateVaccineId,
  generateImmunizationId,
  generateStandingOrderId,
  isVaccineExpired,
  isVaccineExpiringSoon,
  isBeyondUseDate,
  calculateBeyondUseDate,
  isTemperatureInRange,
  checkTemperatureExcursion,
  createVaccine,
  updateVaccineQuantity,
  allocateVaccine,
  deallocateVaccine,
  checkStandingOrderEligibility,
  createImmunizationRecord as createImmunization,
  voidImmunizationRecord,
  isRegistryReportingRequired,
  getIISReportingDeadline,
  isIISSubmissionOverdue,
  checkVFCEligibility,
  calculateObservationPeriod,
  createStorageUnit,
  createTemperatureLog,
  getVaccinesNeedingReorder,
  getExpiringVaccines,
  getExpiringStandingOrders,
  formatForVIS,
  getImmunizationSummary,
} from './immunization';

// Prescriber Communication
export type {
  PrescriberMessageType,
  CommunicationChannel,
  MessageStatus,
  ResponseType,
  MessagePriority,
  PrescriberContact,
  PharmacyContact,
  PrescriptionReference,
  PatientReference,
  PrescriberMessage,
  MessageAuditEntry,
  RenewalRequest,
  PriorAuthRequest,
  ClarificationRequest,
  TherapyChangeRequest,
  MessageTemplate,
  CommunicationStats,
} from './prescriber-comm';

export {
  PrescriberContactSchema,
  PharmacyContactSchema,
  PrescriberMessageSchema,
  MESSAGE_TYPE_NAMES,
  CHANNEL_NAMES,
  STATUS_NAMES,
  RESPONSE_TYPE_NAMES,
  DEFAULT_RESPONSE_DEADLINES,
  MAX_RETRY_ATTEMPTS,
  generateMessageId,
  createMessage,
  updateMessageStatus,
  markMessageSent,
  markMessageDelivered,
  markMessageRead,
  recordResponse,
  markMessageFailed,
  markForRetry,
  cancelMessage,
  isMessageExpired,
  checkAndMarkExpired,
  generateFillNotification,
  generateRenewalRequest,
  generatePriorAuthRequest,
  generateClarificationRequest,
  generateTherapyChangeRequest,
  getPendingFollowUps,
  getExpiredMessages,
  calculateCommunicationStats,
  formatForFax,
  getMessagesByPrescriber,
  getMessagesByPatient,
  getMessagesRequiringAction,
} from './prescriber-comm';
