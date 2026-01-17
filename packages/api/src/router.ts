// tRPC Router definitions
import { router } from './trpc';
import { patientRouter } from './routers/patient';
import { encounterRouter } from './routers/encounter';
import { observationRouter } from './routers/observation';
import { medicationRouter } from './routers/medication';
import { fhirRouter } from './routers/fhir';
import { prescriptionRouter } from './routers/prescription';
import { userRouter } from './routers/user';
import { pharmacyRouter } from './routers/pharmacy';
import { pharmacyWorkflowRouter } from './routers/pharmacy-workflow';
import { intakeRouter } from './routers/intake';
import { fillRouter } from './routers/fill';
import { verifyRouter } from './routers/verify';
import { claimsRouter } from './routers/claims';
import { dispenseRouter } from './routers/dispense';
import { pdmpRouter } from './routers/pdmp';
import { dataEntryRouter } from './routers/data-entry';

import { userManagementRouter } from './routers/user-management';

/**
 * Main application router
 * Combines all healthcare-specific routers
 *
 * Router structure:
 * - patient: Patient CRUD operations
 * - encounter: Clinical encounters/visits
 * - observation: Vitals and clinical observations
 * - medication: Medication management
 * - prescription: Prescription management
 * - fhir: FHIR R4 interoperability
 * - user: User management and authentication
 * - userManagement: Master user administration
 * - pharmacy: Pharmacy operations (staff, intake, PDMP, immunizations, inventory, will-call)
 * - pharmacyWorkflow: Retail dispensing workflow (queue, dataEntry, claim, fill, verify, dispense)
 * - dataEntry: Prescription data entry and validation
 * - pdmp: PDMP queries and controlled substance monitoring
 */
export const appRouter = router({
  // Clinical routers
  patient: patientRouter,
  encounter: encounterRouter,
  observation: observationRouter,
  medication: medicationRouter,
  prescription: prescriptionRouter,

  // Interoperability
  fhir: fhirRouter,

  // Administration
  user: userRouter,
  userManagement: userManagementRouter,

  // Pharmacy operations
  pharmacy: pharmacyRouter,
  intake: intakeRouter,
  fill: fillRouter,
  verify: verifyRouter,
  claims: claimsRouter,
  dispense: dispenseRouter,
  pdmp: pdmpRouter,
  dataEntry: dataEntryRouter,

  // Retail pharmacy dispensing workflow
  pharmacyWorkflow: pharmacyWorkflowRouter,
});

export type AppRouter = typeof appRouter;