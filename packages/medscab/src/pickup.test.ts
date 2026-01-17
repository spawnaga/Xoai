import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSessionId,
  generateVerificationId,
  generateSignatureId,
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
  getReadyForReturn,
  getExpiringSoon,
  matchPatients,
  RetailPickupSearchSchema,
  SIGNATURE_EXPIRY_MONTHS,
  DEFAULT_RETURN_DAYS,
  ID_TYPE_NAMES,
  type PickupSession,
  type PickupPrescription,
  type PatientMatch,
  type RetailPickupSearch,
  type WillCallBinEnhanced,
} from './pickup';

describe('Pickup Module', () => {
  describe('ID Generation', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^PU-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate unique verification IDs', () => {
      const id1 = generateVerificationId();
      const id2 = generateVerificationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^IDV-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate unique signature IDs', () => {
      const id1 = generateSignatureId();
      const id2 = generateSignatureId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^SIG-[A-Z0-9]+-[A-Z0-9]+$/);
    });
  });

  describe('Retail Search Validation', () => {
    it('should validate correct search criteria', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const result = validateRetailSearch(search);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject short first name chars', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'J',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const result = validateRetailSearch(search);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('First name'))).toBe(true);
    });

    it('should allow single letter with override', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'L',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
        singleLetterFirstName: true,
      };

      const result = validateRetailSearch(search);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid DOB format', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '1980-05-15',
      };

      const result = validateRetailSearch(search);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('MM/DD/YYYY'))).toBe(true);
    });
  });

  describe('createPickupSession', () => {
    it('should create retail pickup session', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const session = createPickupSession('retail', search, 'user_001', 'station_001');

      expect(session.id).toMatch(/^PU-/);
      expect(session.sessionType).toBe('retail');
      expect(session.status).toBe('searching');
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.auditTrail.length).toBe(1);
    });

    it('should create drive-thru pickup session', () => {
      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const session = createPickupSession('drive_thru', search, 'user_001');

      expect(session.sessionType).toBe('drive_thru');
    });
  });

  describe('selectPatient', () => {
    it('should select patient for session', () => {
      const session = createMockSession();
      const patient = createMockPatientMatch();
      const prescriptions = [createMockPrescription()];

      const updated = selectPatient(session, patient, prescriptions, 'user_001');

      expect(updated.status).toBe('patient_selected');
      expect(updated.selectedPatientId).toBe(patient.patientId);
      expect(updated.prescriptionsToPickup.length).toBe(1);
    });

    it('should set ID verification required for controlled substances', () => {
      const session = createMockSession();
      const patient = createMockPatientMatch();
      const prescriptions = [createMockPrescription({ isControlled: true, requiresId: true })];

      const updated = selectPatient(session, patient, prescriptions, 'user_001');

      expect(updated.idVerificationRequired).toBe(true);
      expect(updated.signatureReasons).toContain('controlled_substance');
    });

    it('should calculate total copay', () => {
      const session = createMockSession();
      const patient = createMockPatientMatch();
      const prescriptions = [
        createMockPrescription({ copayAmount: 10.5 }),
        createMockPrescription({ copayAmount: 25.0 }),
      ];

      const updated = selectPatient(session, patient, prescriptions, 'user_001');

      expect(updated.totalCopay).toBe(35.5);
    });
  });

  describe('scanPrescription', () => {
    it('should scan prescription by barcode', () => {
      const session = createMockSessionWithPatient();
      const barcode = session.prescriptionsToPickup[0]!.barcode;

      const result = scanPrescription(session, barcode, 'user_001');

      expect(result.success).toBe(true);
      expect(result.session.scannedBarcodes).toContain(barcode);
    });

    it('should reject unmatched barcode', () => {
      const session = createMockSessionWithPatient();

      const result = scanPrescription(session, 'INVALID_BARCODE', 'user_001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not match');
    });

    it('should reject duplicate scan', () => {
      const session = createMockSessionWithPatient();
      const barcode = session.prescriptionsToPickup[0]!.barcode;

      const result1 = scanPrescription(session, barcode, 'user_001');
      const result2 = scanPrescription(result1.session, barcode, 'user_001');

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already scanned');
    });
  });

  describe('captureSignature', () => {
    it('should capture signature with HIPAA acknowledgment', () => {
      const session = createMockSessionWithPatient();
      session.signatureRequired = true;

      const updated = captureSignature(session, 'base64_signature_data', 'user_001', {
        hipaaAcknowledged: true,
        counselingOffered: true,
        counselingAccepted: false,
      });

      expect(updated.signatureData).toBeDefined();
      expect(updated.signatureData?.hipaaAcknowledged).toBe(true);
      expect(updated.signatureData?.isValid).toBe(true);
    });

    it('should set signature expiration to 6 months', () => {
      const session = createMockSessionWithPatient();
      session.signatureRequired = true;

      const updated = captureSignature(session, 'base64_signature_data', 'user_001', {
        hipaaAcknowledged: true,
        counselingOffered: true,
        counselingAccepted: true,
      });

      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + SIGNATURE_EXPIRY_MONTHS);

      // Within 1 day tolerance
      const diff = Math.abs(updated.signatureData!.expiresAt.getTime() - sixMonthsFromNow.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  describe('verifyPatientId', () => {
    it('should verify patient ID', () => {
      const session = createMockSessionWithPatient();
      session.idVerificationRequired = true;

      const updated = verifyPatientId(
        session,
        {
          verifiedBy: 'user_001',
          idType: 'drivers_license',
          idNumber: '1234',
          idState: 'CA',
          isExpired: false,
          photoMatches: true,
          nameMatches: true,
          dobMatches: true,
          idValid: true,
        },
        'user_001'
      );

      expect(updated.idVerification).toBeDefined();
      expect(updated.idVerification?.idValid).toBe(true);
    });

    it('should reject expired ID', () => {
      const session = createMockSessionWithPatient();
      session.idVerificationRequired = true;

      const updated = verifyPatientId(
        session,
        {
          verifiedBy: 'user_001',
          idType: 'drivers_license',
          idNumber: '1234',
          expirationDate: new Date('2020-01-01'),
          isExpired: true,
          photoMatches: true,
          nameMatches: true,
          dobMatches: true,
          idValid: false,
        },
        'user_001'
      );

      expect(updated.idVerification?.isExpired).toBe(true);
      expect(updated.idVerification?.idValid).toBe(false);
    });
  });

  describe('completeCounseling', () => {
    it('should complete counseling acceptance', () => {
      const session = createMockSessionWithPatient();
      session.counselingRequired = true;

      const updated = completeCounseling(session, 'completed', 'pharmacist_001', 'Patient educated on side effects');

      expect(updated.counselingStatus).toBe('completed');
      expect(updated.pharmacistId).toBe('pharmacist_001');
      expect(updated.counselingNotes).toBe('Patient educated on side effects');
    });

    it('should record counseling decline', () => {
      const session = createMockSessionWithPatient();
      session.counselingRequired = true;

      const updated = completeCounseling(session, 'declined', 'pharmacist_001', 'Patient declined counseling');

      expect(updated.counselingStatus).toBe('declined');
    });
  });

  describe('recordPayment', () => {
    it('should record payment', () => {
      const session = createMockSessionWithPatient();
      session.totalCopay = 25.0;

      const updated = recordPayment(session, 25.0, 'card', 'RCT-001', 'user_001');

      expect(updated.paymentCollected).toBe(true);
      expect(updated.paymentAmount).toBe(25.0);
      expect(updated.paymentMethod).toBe('card');
      expect(updated.receiptNumber).toBe('RCT-001');
    });
  });

  describe('completePickup', () => {
    it('should complete pickup session', () => {
      let session = createMockCompletableSession();
      // Ensure counseling status is resolved
      session.counselingStatus = 'waived';
      // Ensure all requirements are met
      session.counselingRequired = false;
      // Handle payment - either no copay or payment collected
      session.totalCopay = 0;

      const result = completePickup(session, 'user_001');

      expect(result.success).toBe(true);
      expect(result.session.status).toBe('completed');
      expect(result.session.completedAt).toBeInstanceOf(Date);
    });

    it('should fail if prescriptions not scanned', () => {
      const session = createMockSessionWithPatient();
      session.allScanned = false;

      const result = completePickup(session, 'user_001');

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('scanned'))).toBe(true);
    });

    it('should fail if signature required but not captured', () => {
      const session = createMockSessionWithPatient();
      session.allScanned = true;
      session.signatureRequired = true;

      const result = completePickup(session, 'user_001');

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('Signature'))).toBe(true);
    });
  });

  describe('cancelPickup', () => {
    it('should cancel pickup session', () => {
      const session = createMockSession();

      const cancelled = cancelPickup(session, 'Patient left', 'user_001');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Signature Validation', () => {
    it('should validate non-expired signature', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3); // 3 months ago

      expect(isSignatureValid(recentDate)).toBe(true);
    });

    it('should invalidate expired signature', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 7); // 7 months ago

      expect(isSignatureValid(oldDate)).toBe(false);
    });

    it('should return false for no signature date', () => {
      expect(isSignatureValid(undefined)).toBe(false);
    });

    it('should calculate signature expiration correctly', () => {
      const signatureDate = new Date('2024-01-15');
      const expiration = calculateSignatureExpiration(signatureDate);

      expect(expiration.getMonth()).toBe(signatureDate.getMonth() + SIGNATURE_EXPIRY_MONTHS >= 12
        ? (signatureDate.getMonth() + SIGNATURE_EXPIRY_MONTHS) % 12
        : signatureDate.getMonth() + SIGNATURE_EXPIRY_MONTHS);
    });
  });

  describe('Will-Call Bin Management', () => {
    it('should create will-call bin', () => {
      const rx = createMockPrescription();

      const bin = createWillCallBin(rx, 'patient_001', 'John Smith', 'A-01');

      expect(bin.binId).toMatch(/^WC-/);
      expect(bin.binLocation).toBe('A-01');
      expect(bin.patientName).toBe('John Smith');
      expect(bin.daysInBin).toBe(0);
      expect(bin.daysUntilReturn).toBe(DEFAULT_RETURN_DAYS);
    });

    it('should create will-call bin with organization', () => {
      const rx = createMockPrescription();

      const bin = createWillCallBin(rx, 'patient_001', 'John Smith', 'A-01', {
        organizationId: 'org_001',
        organizationName: 'Sunny Acres Nursing Home',
        groupCode: 'SNF-001',
      });

      expect(bin.organizationId).toBe('org_001');
      expect(bin.organizationName).toBe('Sunny Acres Nursing Home');
    });

    it('should update will-call days', () => {
      const rx = createMockPrescription();
      const bin = createWillCallBin(rx, 'patient_001', 'John Smith', 'A-01');

      // Simulate bin placed 5 days ago - need to adjust both placedAt and returnToStockDate
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(fiveDaysAgo);
      returnDate.setDate(returnDate.getDate() + DEFAULT_RETURN_DAYS);

      bin.placedAt = fiveDaysAgo;
      bin.returnToStockDate = returnDate;

      const updated = updateWillCallDays(bin);

      expect(updated.daysInBin).toBe(5);
      expect(updated.daysUntilReturn).toBe(DEFAULT_RETURN_DAYS - 5);
    });

    it('should get bins ready for return', () => {
      const bins: WillCallBinEnhanced[] = [
        createMockWillCallBin({ daysUntilReturn: 0, insuranceReversed: false }),
        createMockWillCallBin({ daysUntilReturn: 5, insuranceReversed: false }),
        createMockWillCallBin({ daysUntilReturn: 0, insuranceReversed: true }),
      ];

      // Set return dates
      bins[0]!.returnToStockDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      bins[1]!.returnToStockDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      bins[2]!.returnToStockDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const ready = getReadyForReturn(bins);

      expect(ready.length).toBe(1);
    });

    it('should get bins expiring soon', () => {
      const bins: WillCallBinEnhanced[] = [
        createMockWillCallBin({ daysUntilReturn: 2, insuranceReversed: false }),
        createMockWillCallBin({ daysUntilReturn: 5, insuranceReversed: false }),
        createMockWillCallBin({ daysUntilReturn: 1, insuranceReversed: false }),
      ];

      // Set return dates to match daysUntilReturn
      bins[0]!.returnToStockDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      bins[1]!.returnToStockDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      bins[2]!.returnToStockDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

      const expiring = getExpiringSoon(bins, 3);

      expect(expiring.length).toBe(2);
    });

    it('should mark will-call as reversed', () => {
      const bin = createMockWillCallBin({});

      const reversed = markWillCallReversed(bin, 'user_001', 'TXN-001');

      expect(reversed.insuranceReversed).toBe(true);
      expect(reversed.reversedBy).toBe('user_001');
      expect(reversed.reversalTransactionId).toBe('TXN-001');
    });

    it('should mark reminder sent', () => {
      const bin = createMockWillCallBin({});
      bin.reminderCount = 0;

      const updated = markReminderSent(bin);

      expect(updated.pickupReminderSent).toBe(true);
      expect(updated.reminderCount).toBe(1);
      expect(updated.reminderSentAt).toBeInstanceOf(Date);
    });
  });

  describe('Patient Matching', () => {
    it('should match patients by name and DOB', () => {
      // Use Date constructor with explicit year, month, day to avoid timezone issues
      const patients = [
        { id: 'p1', firstName: 'John', lastName: 'Smith', dateOfBirth: new Date(1980, 4, 15) }, // May 15, 1980
        { id: 'p2', firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date(1990, 2, 20) }, // Mar 20, 1990
        { id: 'p3', firstName: 'Johnny', lastName: 'Smithson', dateOfBirth: new Date(1980, 4, 15) }, // May 15, 1980
      ];

      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const matches = matchPatients(patients, search);

      expect(matches.length).toBe(2);
      expect(matches.some((m) => m.patientId === 'p1')).toBe(true);
      expect(matches.some((m) => m.patientId === 'p3')).toBe(true);
    });

    it('should not match patients with different DOB', () => {
      // Use Date constructor with explicit year, month, day to avoid timezone issues
      const patients = [
        { id: 'p1', firstName: 'John', lastName: 'Smith', dateOfBirth: new Date(1980, 4, 16) }, // May 16, 1980
      ];

      const search: RetailPickupSearch = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const matches = matchPatients(patients, search);

      expect(matches.length).toBe(0);
    });
  });

  describe('Schema Validation', () => {
    it('should validate retail pickup search schema', () => {
      const search = {
        firstNameChars: 'JO',
        lastNameChars: 'SM',
        dateOfBirth: '05/15/1980',
      };

      const result = RetailPickupSearchSchema.safeParse(search);
      expect(result.success).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have signature expiry months defined', () => {
      expect(SIGNATURE_EXPIRY_MONTHS).toBe(6);
    });

    it('should have default return days defined', () => {
      expect(DEFAULT_RETURN_DAYS).toBe(10);
    });

    it('should have ID type names', () => {
      expect(ID_TYPE_NAMES.drivers_license).toBeDefined();
      expect(ID_TYPE_NAMES.passport).toBeDefined();
    });
  });
});

// Helper Functions
function createMockSession(): PickupSession {
  const search: RetailPickupSearch = {
    firstNameChars: 'JO',
    lastNameChars: 'SM',
    dateOfBirth: '05/15/1980',
  };

  return createPickupSession('retail', search, 'user_001', 'station_001');
}

function createMockSessionWithPatient(): PickupSession {
  const session = createMockSession();
  const patient = createMockPatientMatch();
  const prescriptions = [createMockPrescription()];

  return selectPatient(session, patient, prescriptions, 'user_001');
}

function createMockCompletableSession(): PickupSession {
  let session = createMockSession();
  const patient = createMockPatientMatch();
  // Create prescription without counseling requirement for simpler completion
  const prescription = createMockPrescription({ requiresCounseling: false });
  const prescriptions = [prescription];

  session = selectPatient(session, patient, prescriptions, 'user_001');

  // Scan all prescriptions
  const scanResult = scanPrescription(session, prescription.barcode, 'user_001');
  session = scanResult.session;

  // Mark counseling completed if required
  if (session.counselingRequired) {
    session = completeCounseling(session, 'completed', 'pharmacist_001');
  }

  return session;
}

function createMockPatientMatch(): PatientMatch {
  return {
    patientId: 'patient_001',
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: new Date('1980-05-15'),
    phone: '555-123-4567',
    address: '123 Main St',
    prescriptionsReady: 1,
    hasControlled: false,
    signatureRequired: false,
    lastPickupDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    matchScore: 100,
  };
}

function createMockPrescription(overrides?: Partial<PickupPrescription>): PickupPrescription {
  return {
    prescriptionId: `rx_${Math.random().toString(36).substr(2, 9)}`,
    rxNumber: `RX-${Date.now()}`,
    drugName: 'Lisinopril',
    strength: '10mg',
    quantity: 30,
    binLocation: 'A-01',
    barcode: `BC-${Math.random().toString(36).substr(2, 9)}`,
    scanned: false,
    isControlled: false,
    requiresId: false,
    requiresCounseling: false,
    isRefrigerated: false,
    copayAmount: 10.0,
    ...overrides,
  };
}

function createMockWillCallBin(overrides: Partial<WillCallBinEnhanced>): WillCallBinEnhanced {
  const now = new Date();
  const returnDate = new Date(now);
  returnDate.setDate(returnDate.getDate() + DEFAULT_RETURN_DAYS);

  return {
    binId: `WC-${Math.random().toString(36).substr(2, 9)}`,
    binLocation: 'A-01',
    prescriptionId: 'rx_001',
    rxNumber: 'RX-001',
    patientId: 'patient_001',
    patientName: 'John Smith',
    drugName: 'Lisinopril',
    quantity: 30,
    placedAt: now,
    returnToStockDate: returnDate,
    daysInBin: 0,
    daysUntilReturn: DEFAULT_RETURN_DAYS,
    isRefrigerated: false,
    isControlled: false,
    signatureOnFile: false,
    insuranceReversed: false,
    pickupReminderSent: false,
    reminderCount: 0,
    prescriberNotified: false,
    ...overrides,
  };
}
