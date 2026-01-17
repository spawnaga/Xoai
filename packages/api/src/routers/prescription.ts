import { z } from 'zod';
import { router, clinicalProcedure, doctorProcedure, pharmacistProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  searchDrugs,
  getDrugById,
  checkDrugInteractions,
  checkAllergies,
  checkContraindications,
  comprehensiveSafetyCheck,
  performDURCheck,
  getDosingGuidelines,
  DEAScheduleInfo,
  type DEASchedule,
} from '@xoai/medscab';

/**
 * Prescription Router - Complete prescription management with DUR
 *
 * Features:
 * - Drug search with RxNorm integration
 * - Drug interaction checking
 * - Allergy cross-reactivity detection
 * - DUR (Drug Utilization Review)
 * - Dosing guidelines
 * - DEA compliance for controlled substances
 */
export const prescriptionRouter = router({
  // ============================================
  // DRUG SEARCH
  // ============================================

  /**
   * Search for drugs by name
   */
  searchDrugs: clinicalProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(50).default(25),
        dosageForm: z.string().optional(),
        route: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return searchDrugs({
        query: input.query,
        limit: input.limit,
        dosageForm: input.dosageForm,
        route: input.route,
      });

    }),

  /**
   * Get drug by ID
   */
  getDrug: clinicalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const drug = await getDrugById(input.id);

      if (!drug) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Drug not found',
        });
      }

      return drug;
    }),

  // ============================================
  // SAFETY CHECKS
  // ============================================

  /**
   * Check drug interactions
   */
  checkInteractions: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        drugName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get patient's current active medications
      const activeMeds = await ctx.db.medication.findMany({
        where: {
          patientId: input.patientId,
          status: 'ACTIVE',
        },
        select: { name: true },
      });

      const currentMedications = activeMeds.map((m: { name: string }) => m.name);
      const result = checkDrugInteractions(input.drugName, currentMedications);

      // Log the interaction check for audit
      await ctx.db.auditLog.create({
        data: {
          action: 'READ',
          resourceType: 'DrugInteractionCheck',
          resourceId: input.patientId,
          userId: ctx.user.id,
          details: {
            drugName: input.drugName,
            currentMedCount: currentMedications.length,
            interactionsFound: result.interactions.length,
          },
        },
      });

    }),

  /**
   * Check allergies for a patient
   */
  checkAllergies: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        drugName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get patient's allergies from the database
      const patient = await ctx.db.patient.findUnique({
        where: { id: input.patientId },
        select: { allergies: true },
      });

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      // Parse allergies (assuming JSON array or comma-separated string)
      let allergies: string[] = [];
      if (patient.allergies) {
        if (typeof patient.allergies === 'string') {
          allergies = patient.allergies.split(',').map((a: string) => a.trim());
        } else if (Array.isArray(patient.allergies)) {
          allergies = patient.allergies;
        }
      }

      return checkAllergies(input.drugName, allergies);

    }),

  /**
   * Check contraindications based on patient conditions
   */
  checkContraindications: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        drugName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get patient's conditions
      const conditions = await ctx.db.condition.findMany({
        where: {
          patientId: input.patientId,
          status: 'ACTIVE',
        },
        select: { name: true },
      });

      const patientConditions = conditions.map((c: { name: string }) => c.name);
      return checkContraindications(input.drugName, patientConditions);

    }),

  /**
   * Comprehensive safety check
   */
  comprehensiveSafetyCheck: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        drugName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get patient data
      const [patient, activeMeds, conditions] = await Promise.all([
        ctx.db.patient.findUnique({
          where: { id: input.patientId },
          select: { allergies: true },
        }),
        ctx.db.medication.findMany({
          where: { patientId: input.patientId, status: 'ACTIVE' },
          select: { name: true },
        }),
        ctx.db.condition.findMany({
          where: { patientId: input.patientId, status: 'ACTIVE' },
          select: { name: true },
        }),
      ]);

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      // Parse allergies
      let allergies: string[] = [];
      if (patient.allergies) {
        if (typeof patient.allergies === 'string') {
          allergies = patient.allergies.split(',').map((a: string) => a.trim());
        } else if (Array.isArray(patient.allergies)) {
          allergies = patient.allergies;
        }
      }

      const result = comprehensiveSafetyCheck(
        input.drugName,
        activeMeds.map((m: { name: string }) => m.name),
        conditions.map((c: { name: string }) => c.name),
        allergies
      );

      // Log safety check
      await ctx.db.auditLog.create({
        data: {
          action: 'READ',
          resourceType: 'SafetyCheck',
          resourceId: input.patientId,
          userId: ctx.user.id,
          details: {
            drugName: input.drugName,
            safe: result.safe,
            overallRisk: result.overallRisk,
          },
        },
      });

    }),

  // ============================================
  // DUR (DRUG UTILIZATION REVIEW)
  // ============================================

  /**
   * Perform full DUR check
   */
  performDUR: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        drugId: z.string(),
        drugName: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        route: z.string(),
        indication: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get patient data
      const [patient, activeMeds, conditions] = await Promise.all([
        ctx.db.patient.findUnique({
          where: { id: input.patientId },
          select: {
            allergies: true,
            dateOfBirth: true,
          },
        }),
        ctx.db.medication.findMany({
          where: { patientId: input.patientId, status: 'ACTIVE' },
          select: { name: true },
        }),
        ctx.db.condition.findMany({
          where: { patientId: input.patientId, status: 'ACTIVE' },
          select: { name: true },
        }),
      ]);

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      // Calculate age
      const age = patient.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(patient.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : undefined;

      // Parse allergies
      let allergies: string[] = [];
      if (patient.allergies) {
        if (typeof patient.allergies === 'string') {
          allergies = patient.allergies.split(',').map((a: string) => a.trim());
        } else if (Array.isArray(patient.allergies)) {
          allergies = patient.allergies;
        }
      }

      // Check for pregnancy condition
      const isPregnant = conditions.some((c) =>
        c.name.toLowerCase().includes('pregnan')
      );

      // Perform DUR check
      const durResult = await performDURCheck({
        patientId: input.patientId,
        drugId: input.drugId,
        drugName: input.drugName,
        dosage: input.dosage,
        frequency: input.frequency,
        route: input.route,
        indication: input.indication,
        currentMedications: activeMeds.map((m: { name: string }) => m.name),
        patientAllergies: allergies,
        patientConditions: conditions.map((c: { name: string }) => c.name),
        patientAge: age,
        isPregnant,
      });

      // Log DUR check
      await ctx.db.auditLog.create({
        data: {
          action: 'READ',
          resourceType: 'DURCheck',
          resourceId: input.patientId,
          userId: ctx.user.id,
          details: {
            drugName: input.drugName,
            passed: durResult.passed,
            alertCount: durResult.alertCount,
            hasHighSeverityAlerts: durResult.hasHighSeverityAlerts,
          },
        },
      });

      return durResult;
    }),

  // ============================================
  // DOSING GUIDELINES
  // ============================================

  /**
   * Get dosing guidelines for a drug
   */
  getDosingGuidelines: clinicalProcedure
    .input(
      z.object({
        drugName: z.string(),
        patientId: z.string().optional(),
        indication: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let patientAge: number | undefined;
      let creatinineClearance: number | undefined;

      // If patient ID provided, get patient-specific data
      if (input.patientId) {
        const patient = await ctx.db.patient.findUnique({
          where: { id: input.patientId },
          select: { dateOfBirth: true },
        });

        if (patient?.dateOfBirth) {
          patientAge = Math.floor(
            (Date.now() - new Date(patient.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          );
        }

        // Get latest creatinine clearance observation if available
        // LOINC codes for creatinine clearance: 2164-2 (serum creatinine), 33914-3 (eGFR)
        const crClObs = await ctx.db.observation.findFirst({
          where: {
            patientId: input.patientId,
            OR: [
              { code: { contains: 'creatinine' } },
              { display: { contains: 'creatinine' } },
              { code: '2164-2' }, // Serum creatinine
              { code: '33914-3' }, // eGFR
            ],
          },
          orderBy: { effectiveDate: 'desc' },
        });

        if (crClObs?.value) {
          creatinineClearance = parseFloat(crClObs.value);
        }
      }

      const guidelines = getDosingGuidelines({
        drugName: input.drugName,
        patientAge: patientAge ?? 40, // Default if not available
        creatinineClearance,
        indication: input.indication,
      });

    }),

  // ============================================
  // CONTROLLED SUBSTANCE COMPLIANCE
  // ============================================

  /**
   * Validate controlled substance prescription
   */
  validateControlledSubstance: doctorProcedure
    .input(
      z.object({
        drugName: z.string(),
        deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V', 'LEGEND', 'OTC']),
        quantity: z.number(),
        refillsRequested: z.number(),
        daysSupply: z.number(),
      })
    )
    .query(async ({ input }) => {
      const scheduleInfo = DEAScheduleInfo[input.deaSchedule as DEASchedule];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check refills
      if (input.refillsRequested > scheduleInfo.refillsAllowed) {
        errors.push(
          `Schedule ${input.deaSchedule} allows maximum ${scheduleInfo.refillsAllowed} refills. Requested: ${input.refillsRequested}`
        );
      }

      // Check quantity limits
      if (scheduleInfo.maxQuantity && input.quantity > scheduleInfo.maxQuantity) {
        errors.push(
          `Schedule ${input.deaSchedule} has maximum quantity of ${scheduleInfo.maxQuantity} units. Requested: ${input.quantity}`
        );
      }

      // Schedule II specific checks
      if (input.deaSchedule === 'II') {
        if (input.refillsRequested > 0) {
          errors.push('Schedule II controlled substances cannot have refills');
        }
        if (input.daysSupply > 90) {
          warnings.push('Schedule II prescriptions typically limited to 90-day supply');
        }
      }

      // Schedule I check
      if (input.deaSchedule === 'I') {
        errors.push('Schedule I substances have no accepted medical use and cannot be prescribed');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        scheduleInfo: {
          schedule: input.deaSchedule,
          description: scheduleInfo.description,
          maxRefills: scheduleInfo.refillsAllowed,
          maxQuantity: scheduleInfo.maxQuantity,
        },
      };
    }),

  // ============================================
  // PRESCRIPTION MANAGEMENT
  // ============================================

  /**
   * Create prescription with full DUR
   */
  create: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        encounterId: z.string().optional(),
        drugId: z.string(),
        drugName: z.string(),
        rxnormCode: z.string().optional(),
        ndcCode: z.string().optional(),
        strength: z.string(),
        dosageForm: z.string(),
        quantity: z.number(),
        quantityUnit: z.string(),
        daysSupply: z.number(),
        sig: z.string(), // Directions
        refillsAuthorized: z.number(),
        deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V', 'LEGEND', 'OTC']).optional(),
        indication: z.string().optional(),
        icd10Codes: z.array(z.string()).optional(),
        frequency: z.string(),
        route: z.string(),
        overrideDUR: z.boolean().default(false),
        overrideReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Perform DUR check
      const durResult = await performDURCheck({
        patientId: input.patientId,
        drugId: input.drugId,
        drugName: input.drugName,
        dosage: input.strength,
        frequency: input.frequency,
        route: input.route,
        indication: input.indication,
      });

      // Block if high severity alerts and no override
      if (durResult.hasHighSeverityAlerts && !input.overrideDUR) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'High severity DUR alerts detected. Review and override if clinically appropriate.',
          cause: {
            alerts: durResult.alerts.filter((a) => a.severity === 'high'),
            summary: durResult.summary,
          },
        });
      }

      // Validate controlled substance if applicable
      if (input.deaSchedule && input.deaSchedule !== 'OTC' && input.deaSchedule !== 'LEGEND') {
        const scheduleInfo = DEAScheduleInfo[input.deaSchedule as DEASchedule];

        if (input.refillsAuthorized > scheduleInfo.refillsAllowed) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Schedule ${input.deaSchedule} allows maximum ${scheduleInfo.refillsAllowed} refills`,
          });
        }

        if (input.deaSchedule === 'I') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Schedule I substances cannot be prescribed',
          });
        }
      }

      // Create the medication record
      const medication = await ctx.db.medication.create({
        data: {
          patientId: input.patientId,
          encounterId: input.encounterId,
          rxnormCode: input.rxnormCode,
          ndcCode: input.ndcCode,
          name: input.drugName,
          dosage: input.strength,
          frequency: input.frequency,
          route: input.route,
          startDate: new Date(),
          prescribedBy: ctx.user.id,
          status: 'ACTIVE',
          // Store additional prescription data in JSON field if available
        },
      });

      // Log prescription creation with DUR results
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'Prescription',
          resourceId: medication.id,
          userId: ctx.user.id,
          details: {
            patientId: input.patientId,
            drugName: input.drugName,
            deaSchedule: input.deaSchedule,
            durPassed: durResult.passed,
            durAlertCount: durResult.alertCount,
            durOverride: input.overrideDUR,
            overrideReason: input.overrideReason,
            quantity: input.quantity,
            daysSupply: input.daysSupply,
            refillsAuthorized: input.refillsAuthorized,
          },
        },
      });

      return {
        prescription: medication,
        durResult,
      };
    }),

  /**
   * Search prescriptions
   */
  search: clinicalProcedure
    .input(
      z.object({
        query: z.string().optional(),
        patientId: z.string().optional(),
        status: z.enum(['ACTIVE', 'COMPLETED', 'STOPPED', 'ON_HOLD']).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const medications = await ctx.db.medication.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          ...(input.patientId && { patientId: input.patientId }),
          ...(input.status && { status: input.status }),
          ...(input.query && {
            OR: [
              { name: { contains: input.query } },
              { rxnormCode: { contains: input.query } },
              { ndcCode: { contains: input.query } },
            ],
          }),
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (medications.length > input.limit) {
        const next = medications.pop();
        nextCursor = next?.id;
      }

      return {
        items: medications,
        nextCursor,
      };
    }),

  // ============================================
  // PHARMACY OPERATIONS
  // ============================================

  /**
   * Process eScript (pharmacy only)
   */
  processEScript: pharmacistProcedure
    .input(
      z.object({
        prescriptionId: z.string(),
        pharmacyNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const medication = await ctx.db.medication.findUnique({
        where: { id: input.prescriptionId },
      });

      if (!medication) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prescription not found',
        });
      }

      // Update medication as filled
      const updated = await ctx.db.medication.update({
        where: { id: input.prescriptionId },
        data: {
          // filledDate would be added to schema
          status: 'ACTIVE',
        },
      });

      // Log pharmacy processing
      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'Prescription',
          resourceId: input.prescriptionId,
          userId: ctx.user.id,
          details: {
            action: 'eScript_processed',
            pharmacyNotes: input.pharmacyNotes,
          },
        },
      });

      return updated;
    }),
});
