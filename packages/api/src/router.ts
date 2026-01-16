// tRPC Router definitions
import { router } from './trpc';
import { patientRouter } from './routers/patient';
import { encounterRouter } from './routers/encounter';
import { observationRouter } from './routers/observation';
import { medicationRouter } from './routers/medication';
import { fhirRouter } from './routers/fhir';
import { prescriptionRouter } from './routers/prescription';

/**
 * Main application router
 * Combines all healthcare-specific routers
 */
export const appRouter = router({
  patient: patientRouter,
  encounter: encounterRouter,
  observation: observationRouter,
  medication: medicationRouter,
  prescription: prescriptionRouter,
  fhir: fhirRouter,
});

export type AppRouter = typeof appRouter;
