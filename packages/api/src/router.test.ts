import { describe, it, expect } from 'vitest';
import { appRouter } from './router';
import type { AppRouter } from './router';
import { patientRouter } from './routers/patient';
import { encounterRouter } from './routers/encounter';
import { observationRouter } from './routers/observation';
import { medicationRouter } from './routers/medication';
import { fhirRouter } from './routers/fhir';

describe('API Router', () => {
  describe('appRouter', () => {
    it('should be defined', () => {
      expect(appRouter).toBeDefined();
    });

    it('should be an object', () => {
      expect(typeof appRouter).toBe('object');
    });

    it('should have all sub-routers registered', () => {
      expect(appRouter._def.procedures).toBeDefined();
    });
  });

  describe('AppRouter type', () => {
    it('should match appRouter structure', () => {
      const router: AppRouter = appRouter;
      expect(router).toBeDefined();
    });
  });

  describe('patientRouter', () => {
    it('should be defined', () => {
      expect(patientRouter).toBeDefined();
    });

    it('should have list procedure', () => {
      expect(patientRouter._def.procedures.list).toBeDefined();
    });

    it('should have getById procedure', () => {
      expect(patientRouter._def.procedures.getById).toBeDefined();
    });

    it('should have create procedure', () => {
      expect(patientRouter._def.procedures.create).toBeDefined();
    });

    it('should have update procedure', () => {
      expect(patientRouter._def.procedures.update).toBeDefined();
    });

    it('should have delete procedure', () => {
      expect(patientRouter._def.procedures.delete).toBeDefined();
    });

    it('should have search procedure', () => {
      expect(patientRouter._def.procedures.search).toBeDefined();
    });
  });

  describe('encounterRouter', () => {
    it('should be defined', () => {
      expect(encounterRouter).toBeDefined();
    });

    it('should have listByPatient procedure', () => {
      expect(encounterRouter._def.procedures.listByPatient).toBeDefined();
    });

    it('should have getById procedure', () => {
      expect(encounterRouter._def.procedures.getById).toBeDefined();
    });

    it('should have create procedure', () => {
      expect(encounterRouter._def.procedures.create).toBeDefined();
    });

    it('should have update procedure', () => {
      expect(encounterRouter._def.procedures.update).toBeDefined();
    });

    it('should have today procedure', () => {
      expect(encounterRouter._def.procedures.today).toBeDefined();
    });

    it('should have stats procedure', () => {
      expect(encounterRouter._def.procedures.stats).toBeDefined();
    });
  });

  describe('observationRouter', () => {
    it('should be defined', () => {
      expect(observationRouter).toBeDefined();
    });

    it('should have listByPatient procedure', () => {
      expect(observationRouter._def.procedures.listByPatient).toBeDefined();
    });

    it('should have getById procedure', () => {
      expect(observationRouter._def.procedures.getById).toBeDefined();
    });

    it('should have create procedure', () => {
      expect(observationRouter._def.procedures.create).toBeDefined();
    });

    it('should have recordVitals procedure', () => {
      expect(observationRouter._def.procedures.recordVitals).toBeDefined();
    });

    it('should have latestVitals procedure', () => {
      expect(observationRouter._def.procedures.latestVitals).toBeDefined();
    });

    it('should have trends procedure', () => {
      expect(observationRouter._def.procedures.trends).toBeDefined();
    });
  });

  describe('medicationRouter', () => {
    it('should be defined', () => {
      expect(medicationRouter).toBeDefined();
    });

    it('should have listByPatient procedure', () => {
      expect(medicationRouter._def.procedures.listByPatient).toBeDefined();
    });

    it('should have getById procedure', () => {
      expect(medicationRouter._def.procedures.getById).toBeDefined();
    });

    it('should have prescribe procedure', () => {
      expect(medicationRouter._def.procedures.prescribe).toBeDefined();
    });

    it('should have updateStatus procedure', () => {
      expect(medicationRouter._def.procedures.updateStatus).toBeDefined();
    });

    it('should have renew procedure', () => {
      expect(medicationRouter._def.procedures.renew).toBeDefined();
    });

    it('should have activeCount procedure', () => {
      expect(medicationRouter._def.procedures.activeCount).toBeDefined();
    });

    it('should have checkInteractions procedure', () => {
      expect(medicationRouter._def.procedures.checkInteractions).toBeDefined();
    });
  });

  describe('fhirRouter', () => {
    it('should be defined', () => {
      expect(fhirRouter).toBeDefined();
    });

    it('should have exportPatient procedure', () => {
      expect(fhirRouter._def.procedures.exportPatient).toBeDefined();
    });

    it('should have importPatient procedure', () => {
      expect(fhirRouter._def.procedures.importPatient).toBeDefined();
    });

    it('should have capabilityStatement procedure', () => {
      expect(fhirRouter._def.procedures.capabilityStatement).toBeDefined();
    });

    it('should have search procedure', () => {
      expect(fhirRouter._def.procedures.search).toBeDefined();
    });
  });
});
