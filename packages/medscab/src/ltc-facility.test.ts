import { describe, it, expect } from 'vitest';
import {
  STANDARD_COMFORT_KIT,
  isDeliveryDay,
  getNextDeliveryDate,
  hasActiveHospiceBenefit,
  generateMAR,
  checkEmergencyKitStatus,
  type DeliverySchedule,
  type FacilityResident,
  type HospiceAdmission,
  type ChartOrderMedication,
  type EmergencyKit,
} from './ltc-facility';

describe('LTC Facility Module', () => {
  describe('STANDARD_COMFORT_KIT', () => {
    it('should include morphine for pain management', () => {
      const morphine = STANDARD_COMFORT_KIT.find(m => m.drugName.includes('Morphine'));

      expect(morphine).toBeDefined();
      expect(morphine?.indication).toContain('Pain');
      expect(morphine?.isControlled).toBe(true);
      expect(morphine?.deaSchedule).toBe('II');
    });

    it('should include lorazepam for anxiety', () => {
      const lorazepam = STANDARD_COMFORT_KIT.find(m => m.drugName.includes('Lorazepam'));

      expect(lorazepam).toBeDefined();
      expect(lorazepam?.indication).toContain('Anxiety');
      expect(lorazepam?.isControlled).toBe(true);
      expect(lorazepam?.deaSchedule).toBe('IV');
    });

    it('should include haloperidol for delirium', () => {
      const haloperidol = STANDARD_COMFORT_KIT.find(m => m.drugName.includes('Haloperidol'));

      expect(haloperidol).toBeDefined();
      expect(haloperidol?.indication).toContain('Delirium');
      expect(haloperidol?.isControlled).toBe(false);
    });

    it('should include anti-nausea medication', () => {
      const antiNausea = STANDARD_COMFORT_KIT.find(m => m.indication.includes('Nausea'));

      expect(antiNausea).toBeDefined();
    });

    it('should include medication for secretions', () => {
      const secretions = STANDARD_COMFORT_KIT.find(m => m.indication.includes('Secretions'));

      expect(secretions).toBeDefined();
    });

    it('should have instructions for all medications', () => {
      STANDARD_COMFORT_KIT.forEach(med => {
        expect(med.instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isDeliveryDay', () => {
    const schedule: DeliverySchedule = {
      regularDays: ['monday', 'wednesday', 'friday'],
      regularTime: '14:00',
      statDeliveryAvailable: true,
      cutoffTime: '12:00',
      weekendDelivery: false,
      holidayDelivery: false,
    };

    it('should return true for scheduled delivery days', () => {
      // Find next Monday
      const monday = getNextDayOfWeek(1);
      expect(isDeliveryDay(schedule, monday)).toBe(true);

      // Find next Wednesday
      const wednesday = getNextDayOfWeek(3);
      expect(isDeliveryDay(schedule, wednesday)).toBe(true);
    });

    it('should return false for non-delivery days', () => {
      // Find next Tuesday
      const tuesday = getNextDayOfWeek(2);
      expect(isDeliveryDay(schedule, tuesday)).toBe(false);

      // Find next Saturday
      const saturday = getNextDayOfWeek(6);
      expect(isDeliveryDay(schedule, saturday)).toBe(false);
    });
  });

  describe('getNextDeliveryDate', () => {
    const schedule: DeliverySchedule = {
      regularDays: ['monday', 'wednesday', 'friday'],
      regularTime: '14:00',
      statDeliveryAvailable: true,
      cutoffTime: '12:00',
      weekendDelivery: false,
      holidayDelivery: false,
    };

    it('should return today if before cutoff on delivery day', () => {
      const monday = getNextDayOfWeek(1);
      monday.setHours(10, 0, 0, 0); // Before cutoff

      const result = getNextDeliveryDate(schedule, monday);

      expect(result.getDay()).toBe(1); // Monday
    });

    it('should return next delivery day if after cutoff', () => {
      const monday = getNextDayOfWeek(1);
      monday.setHours(14, 0, 0, 0); // After cutoff

      const result = getNextDeliveryDate(schedule, monday);

      expect(result.getDay()).toBe(3); // Wednesday
    });

    it('should return next delivery day from non-delivery day', () => {
      const tuesday = getNextDayOfWeek(2);

      const result = getNextDeliveryDate(schedule, tuesday);

      expect(result.getDay()).toBe(3); // Wednesday
    });

    it('should handle end of week', () => {
      const saturday = getNextDayOfWeek(6);

      const result = getNextDeliveryDate(schedule, saturday);

      expect(result.getDay()).toBe(1); // Next Monday
    });
  });

  describe('hasActiveHospiceBenefit', () => {
    const baseResident: FacilityResident = {
      id: 'RES-001',
      facilityId: 'FAC-001',
      roomNumber: '101',
      patientId: 'PAT-001',
      admissionDate: new Date('2024-01-01'),
      status: 'active',
      attendingPhysicianId: 'DOC-001',
      primaryDiagnosis: 'Heart Failure',
      diagnoses: ['Heart Failure', 'COPD'],
      allergies: [],
      codeStatus: 'dnr',
      emergencyContact: {
        name: 'John Doe',
        relationship: 'Son',
        phone: '555-1234',
        isPowerOfAttorney: true,
        isHealthcareProxy: true,
      },
      insuranceInfo: {
        primaryType: 'hospice',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const activeHospice: HospiceAdmission = {
      id: 'HOSP-001',
      residentId: 'RES-001',
      hospiceProviderId: 'HOSPROV-001',
      hospiceProviderName: 'Comfort Care Hospice',
      terminalDiagnosis: 'Heart Failure',
      terminalPrognosis: '6 months or less',
      admissionDate: new Date('2024-01-01'),
      levelOfCare: 'routine_home_care',
      comfortKitOrdered: true,
      dnrOnFile: true,
      advanceDirectivesReviewed: true,
      symptomManagement: ['Pain', 'Dyspnea'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return true for active hospice benefit', () => {
      expect(hasActiveHospiceBenefit(baseResident, activeHospice)).toBe(true);
    });

    it('should return false if insurance is not hospice', () => {
      const nonHospiceResident = {
        ...baseResident,
        insuranceInfo: { primaryType: 'medicare_a' as const },
      };

      expect(hasActiveHospiceBenefit(nonHospiceResident, activeHospice)).toBe(false);
    });

    it('should return false if no hospice admission', () => {
      expect(hasActiveHospiceBenefit(baseResident, undefined)).toBe(false);
    });

    it('should return false if hospice discharged', () => {
      const dischargedHospice = {
        ...activeHospice,
        dischargeDate: new Date('2024-06-01'),
      };

      expect(hasActiveHospiceBenefit(baseResident, dischargedHospice)).toBe(false);
    });
  });

  describe('generateMAR', () => {
    const resident: FacilityResident = {
      id: 'RES-001',
      facilityId: 'FAC-001',
      roomNumber: '101',
      patientId: 'PAT-001',
      admissionDate: new Date('2024-01-01'),
      status: 'active',
      attendingPhysicianId: 'DOC-001',
      primaryDiagnosis: 'Hypertension',
      diagnoses: ['Hypertension'],
      allergies: [],
      codeStatus: 'full_code',
      emergencyContact: {
        name: 'John Doe',
        relationship: 'Son',
        phone: '555-1234',
        isPowerOfAttorney: false,
        isHealthcareProxy: false,
      },
      insuranceInfo: {
        primaryType: 'medicare_a',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const medications: ChartOrderMedication[] = [
      {
        id: 'MED-001',
        drugName: 'Lisinopril',
        strength: '10mg',
        dosageForm: 'Tablet',
        dose: '10mg',
        route: 'PO',
        frequency: 'Daily',
        administrationTimes: ['08:00'],
        prn: false,
        startDate: new Date('2024-01-01'),
        isControlled: false,
        requiresCrushing: false,
        isHighAlert: false,
      },
      {
        id: 'MED-002',
        drugName: 'Metoprolol',
        strength: '25mg',
        dosageForm: 'Tablet',
        dose: '25mg',
        route: 'PO',
        frequency: 'BID',
        administrationTimes: ['08:00', '20:00'],
        prn: false,
        startDate: new Date('2024-01-01'),
        isControlled: false,
        requiresCrushing: false,
        isHighAlert: false,
      },
    ];

    it('should generate MAR with correct structure', () => {
      const startDate = new Date('2024-01-15');
      const mar = generateMAR(resident, medications, startDate, 7);

      expect(mar.facilityId).toBe('FAC-001');
      expect(mar.residentId).toBe('RES-001');
      expect(mar.roomNumber).toBe('101');
      expect(mar.medications).toHaveLength(2);
    });

    it('should create administration records for each day and time', () => {
      const startDate = new Date('2024-01-15');
      const mar = generateMAR(resident, medications, startDate, 7);

      // Lisinopril: 1 time per day x 7 days = 7 records
      const lisinopril = mar.medications.find(m => m.drugName === 'Lisinopril');
      expect(lisinopril?.administrationRecords).toHaveLength(7);

      // Metoprolol: 2 times per day x 7 days = 14 records
      const metoprolol = mar.medications.find(m => m.drugName === 'Metoprolol');
      expect(metoprolol?.administrationRecords).toHaveLength(14);
    });

    it('should set all records to scheduled status', () => {
      const startDate = new Date('2024-01-15');
      const mar = generateMAR(resident, medications, startDate);

      mar.medications.forEach(med => {
        med.administrationRecords.forEach(record => {
          expect(record.status).toBe('scheduled');
        });
      });
    });

    it('should exclude expired medications', () => {
      const startDate = new Date('2024-06-01');
      const medsWithExpired: ChartOrderMedication[] = [
        ...medications,
        {
          id: 'MED-003',
          drugName: 'Expired Med',
          strength: '5mg',
          dosageForm: 'Tablet',
          dose: '5mg',
          route: 'PO',
          frequency: 'Daily',
          administrationTimes: ['08:00'],
          prn: false,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-05-01'), // Expired before start
          isControlled: false,
          requiresCrushing: false,
          isHighAlert: false,
        },
      ];

      const mar = generateMAR(resident, medsWithExpired, startDate);

      expect(mar.medications).toHaveLength(2);
      expect(mar.medications.find(m => m.drugName === 'Expired Med')).toBeUndefined();
    });
  });

  describe('checkEmergencyKitStatus', () => {
    const createMockKit = (overrides?: Partial<EmergencyKit>): EmergencyKit => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      return {
        id: 'KIT-001',
        facilityId: 'FAC-001',
        location: 'Nurse Station A',
        sealNumber: 'SEAL-12345',
        pharmacyId: 'PHARM-001',
        lastInventoryDate: thirtyDaysAgo,
        lastSealedDate: thirtyDaysAgo,
        expirationDate: sixMonthsFromNow,
        status: 'sealed',
        medications: [],
        accessLog: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    };

    it('should return ok status for properly maintained kit', () => {
      const kit = createMockKit();

      const result = checkEmergencyKitStatus(kit);

      expect(result.status).toBe('ok');
      expect(result.issues).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should report opened kit as issue', () => {
      const kit = createMockKit({ status: 'opened' });

      const result = checkEmergencyKitStatus(kit);

      expect(result.status).toBe('action_required');
      expect(result.issues.some(i => i.includes('opened'))).toBe(true);
      expect(result.needsReseal).toBe(true);
    });

    it('should report expired kit as issue', () => {
      const expiredDate = new Date();
      expiredDate.setMonth(expiredDate.getMonth() - 1);

      const kit = createMockKit({ expirationDate: expiredDate });

      const result = checkEmergencyKitStatus(kit);

      expect(result.status).toBe('action_required');
      expect(result.issues.some(i => i.includes('expired'))).toBe(true);
      expect(result.needsRestock).toBe(true);
    });

    it('should warn for expiring soon', () => {
      const soonExpiring = new Date();
      soonExpiring.setDate(soonExpiring.getDate() + 20); // 20 days

      const kit = createMockKit({ expirationDate: soonExpiring });

      const result = checkEmergencyKitStatus(kit);

      expect(result.status).toBe('warning');
      expect(result.warnings.some(w => w.includes('expire'))).toBe(true);
    });

    it('should warn for overdue inventory', () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const kit = createMockKit({ lastInventoryDate: sixtyDaysAgo });

      const result = checkEmergencyKitStatus(kit);

      expect(result.status).toBe('warning');
      expect(result.warnings.some(w => w.includes('inventory'))).toBe(true);
    });

    it('should calculate next inventory due date', () => {
      const inventoryDate = new Date('2024-01-15');
      const kit = createMockKit({ lastInventoryDate: inventoryDate });

      const result = checkEmergencyKitStatus(kit);

      const expectedDue = new Date('2024-02-14');
      expect(result.nextInventoryDue.toDateString()).toBe(expectedDue.toDateString());
    });
  });
});

// Helper function to get next occurrence of a specific day of week
function getNextDayOfWeek(dayOfWeek: number): Date {
  const date = new Date();
  const currentDay = date.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntil);
  date.setHours(0, 0, 0, 0);
  return date;
}
