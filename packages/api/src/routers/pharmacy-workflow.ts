import { z } from 'zod';
import {
  router,
  protectedProcedure,
  pharmacistLevelProcedure,
  techLevelProcedure,
} from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Pharmacy Workflow Router
 *
 * Handles retail pharmacy dispensing workflow:
 * Intake → Data Entry → Claim → Fill → Verify → Dispense
 */
export const pharmacyWorkflowRouter = router({
  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  queue: router({
    /**
     * Get queue summary counts
     */
    summary: techLevelProcedure.query(async ({ ctx }) => {
      const counts = await ctx.db.$transaction([
        ctx.db.prescription.count({ where: { workflowState: 'INTAKE' } }),
        ctx.db.prescription.count({ where: { workflowState: 'DATA_ENTRY' } }),
        ctx.db.prescription.count({ where: { workflowState: 'DATA_ENTRY_COMPLETE' } }),
        ctx.db.prescription.count({ where: { workflowState: 'INSURANCE_PENDING' } }),
        ctx.db.prescription.count({ where: { workflowState: 'INSURANCE_REJECTED' } }),
        ctx.db.prescription.count({ where: { workflowState: 'DUR_REVIEW' } }),
        ctx.db.prescription.count({ where: { workflowState: 'PRIOR_AUTH_PENDING' } }),
        ctx.db.prescription.count({ where: { workflowState: 'PRIOR_AUTH_APPROVED' } }),
        ctx.db.prescription.count({ where: { workflowState: 'FILLING' } }),
        ctx.db.prescription.count({ where: { workflowState: 'VERIFICATION' } }),
        ctx.db.prescription.count({ where: { workflowState: 'READY' } }),
        ctx.db.prescription.count({ where: { priority: 'STAT', workflowState: { notIn: ['SOLD', 'DELIVERED', 'CANCELLED', 'RETURNED_TO_STOCK'] } } }),
        ctx.db.prescription.count({ where: { priority: 'URGENT', workflowState: { notIn: ['SOLD', 'DELIVERED', 'CANCELLED', 'RETURNED_TO_STOCK'] } } }),
        ctx.db.prescription.count({ where: { isOnHold: true } }),
        ctx.db.prescription.count({ where: { promiseTime: { lt: new Date() }, workflowState: { notIn: ['SOLD', 'DELIVERED', 'CANCELLED', 'RETURNED_TO_STOCK'] } } }),
      ]);

      return {
        intake: counts[0],
        dataEntry: counts[1],
        dataEntryComplete: counts[2],
        insurancePending: counts[3],
        insuranceRejected: counts[4],
        durReview: counts[5],
        priorAuthPending: counts[6],
        priorAuthApproved: counts[7],
        filling: counts[8],
        verification: counts[9],
        ready: counts[10],
        statCount: counts[11],
        urgentCount: counts[12],
        onHoldCount: counts[13],
        overdueCount: counts[14],
        total: counts[0] + counts[1] + counts[2] + counts[3] + counts[4] +
               counts[5] + counts[6] + counts[7] + counts[8] + counts[9] + counts[10],
      };
    }),

    /**
     * Get prescriptions by workflow state
     */
    byState: techLevelProcedure
      .input(
        z.object({
          state: z.enum([
            'INTAKE', 'DATA_ENTRY', 'DATA_ENTRY_COMPLETE', 'INSURANCE_PENDING',
            'INSURANCE_REJECTED', 'DUR_REVIEW', 'PRIOR_AUTH_PENDING', 'PRIOR_AUTH_APPROVED',
            'FILLING', 'VERIFICATION', 'READY',
          ]),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().nullish(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { state, limit, cursor } = input;

        const prescriptions = await ctx.db.prescription.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: { workflowState: state },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, mrn: true } },
            prescriber: { select: { id: true, firstName: true, lastName: true, npiNumber: true } },
            drug: { select: { id: true, displayName: true, strength: true, dosageForm: true } },
            assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
            durAlerts: { where: { isOverridden: false }, select: { id: true, severity: true } },
          },
          orderBy: [
            { priority: 'asc' },
            { promiseTime: 'asc' },
            { createdAt: 'asc' },
          ],
        });

        let nextCursor: typeof cursor = undefined;
        if (prescriptions.length > limit) {
          const nextItem = prescriptions.pop();
          nextCursor = nextItem?.id;
        }

        return { items: prescriptions, nextCursor };
      }),

    /**
     * Get prescriptions assigned to current user
     */
    myAssigned: techLevelProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          return { items: [] };
        }

        const prescriptions = await ctx.db.prescription.findMany({
          take: input.limit,
          where: {
            assignedToId: staff.id,
            workflowState: { notIn: ['SOLD', 'DELIVERED', 'CANCELLED', 'RETURNED_TO_STOCK'] },
          },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            drug: { select: { displayName: true, strength: true } },
          },
          orderBy: [{ priority: 'asc' }, { promiseTime: 'asc' }],
        });

        return { items: prescriptions };
      }),
  }),

  // ============================================================================
  // DATA ENTRY
  // ============================================================================

  dataEntry: router({
    /**
     * Get prescription for data entry
     */
    getById: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.id },
          include: {
            patient: true,
            prescriber: true,
            drug: true,
            insurancePlan: true,
            notes: { orderBy: { createdAt: 'desc' }, take: 10 },
            stateHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
          },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        return prescription;
      }),

    /**
     * Start data entry (assign to current user)
     */
    start: techLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        if (prescription.workflowState !== 'INTAKE' && prescription.workflowState !== 'DATA_ENTRY') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot start data entry from state ${prescription.workflowState}`,
          });
        }

        const updated = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            workflowState: 'DATA_ENTRY',
            assignedToId: staff.id,
            stateHistory: {
              create: {
                fromState: prescription.workflowState,
                toState: 'DATA_ENTRY',
                changedById: staff.id,
                reason: 'Data entry started',
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'startDataEntry', state: 'DATA_ENTRY' },
          },
        });

        return updated;
      }),

    /**
     * Update prescription data
     */
    updateField: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          field: z.string(),
          value: z.unknown(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const allowedFields = [
          'drugId', 'drugNdc', 'drugName', 'strength', 'dosageForm',
          'quantityWritten', 'daysSupply', 'directions', 'dawCode',
          'refillsAuthorized', 'isControlled', 'deaSchedule',
          'writtenDate', 'effectiveDate', 'expirationDate',
          'prescriberId', 'insurancePlanId', 'priorAuthNumber',
          'priority', 'promiseTime', 'requiresCounseling', 'requiresIdCheck',
        ];

        if (!allowedFields.includes(input.field)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Field ${input.field} is not editable` });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: { [input.field]: input.value },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { field: input.field },
          },
        });

        return prescription;
      }),

    /**
     * Search drugs by name or NDC
     */
    searchDrug: techLevelProcedure
      .input(
        z.object({
          query: z.string().min(2),
          limit: z.number().min(1).max(50).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const drugs = await ctx.db.drug.findMany({
          take: input.limit,
          where: {
            isActive: true,
            OR: [
              { genericName: { contains: input.query } },
              { brandName: { contains: input.query } },
              { displayName: { contains: input.query } },
              { ndc: { startsWith: input.query.replace(/-/g, '') } },
            ],
          },
          orderBy: { displayName: 'asc' },
        });

        return drugs;
      }),

    /**
     * Search prescribers by name or NPI
     */
    searchPrescriber: techLevelProcedure
      .input(
        z.object({
          query: z.string().min(2),
          limit: z.number().min(1).max(50).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const prescribers = await ctx.db.prescriber.findMany({
          take: input.limit,
          where: {
            isActive: true,
            OR: [
              { lastName: { contains: input.query } },
              { firstName: { contains: input.query } },
              { npiNumber: { startsWith: input.query } },
              { deaNumber: { startsWith: input.query.toUpperCase() } },
            ],
          },
          orderBy: { lastName: 'asc' },
        });

        return prescribers;
      }),

    /**
     * Submit data entry (move to next state)
     */
    submit: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          hasInsurance: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        // Determine next state based on insurance
        const nextState = input.hasInsurance ? 'INSURANCE_PENDING' : 'FILLING';

        const updated = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            workflowState: nextState,
            quantityRemaining: prescription.quantityWritten,
            refillsRemaining: prescription.refillsAuthorized,
            stateHistory: {
              create: {
                fromState: prescription.workflowState,
                toState: nextState,
                changedById: staff.id,
                reason: 'Data entry completed',
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'submitDataEntry', state: nextState },
          },
        });

        return updated;
      }),
  }),

  // ============================================================================
  // CLAIMS
  // ============================================================================

  claim: router({
    /**
     * Get pending claims
     */
    list: techLevelProcedure
      .input(
        z.object({
          status: z.enum(['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'REVERSED', 'APPEALING']).optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().nullish(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { status, limit, cursor } = input;

        const claims = await ctx.db.claimTransaction.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: status ? { status } : undefined,
          include: {
            prescription: {
              include: {
                patient: { select: { firstName: true, lastName: true } },
                drug: { select: { displayName: true } },
              },
            },
            insurancePlan: { select: { planName: true, pbmName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        let nextCursor: typeof cursor = undefined;
        if (claims.length > limit) {
          const nextItem = claims.pop();
          nextCursor = nextItem?.id;
        }

        return { items: claims, nextCursor };
      }),

    /**
     * Submit claim for prescription
     */
    submit: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          bin: z.string().length(6),
          pcn: z.string(),
          groupNumber: z.string().optional(),
          memberId: z.string(),
          personCode: z.string().default('01'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
          include: { drug: true, patient: true, prescriber: true },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        // Create claim transaction
        const claim = await ctx.db.claimTransaction.create({
          data: {
            prescriptionId: input.prescriptionId,
            transactionType: 'B1',
            bin: input.bin,
            pcn: input.pcn,
            groupNumber: input.groupNumber,
            memberId: input.memberId,
            personCode: input.personCode,
            ndc: prescription.drugNdc ?? '',
            quantity: prescription.quantityWritten,
            daysSupply: prescription.daysSupply,
            dawCode: 0, // Default
            ingredientCostSubmitted: 0,
            dispensingFeeSubmitted: 0,
            grossAmountSubmitted: 0,
            usualAndCustomary: 0,
            status: 'PENDING',
            submittedAt: new Date(),
          },
        });

        // Update prescription state
        await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: { workflowState: 'INSURANCE_PENDING' },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'ClaimTransaction',
            resourceId: claim.id,
            userId: ctx.user.id,
            details: { prescriptionId: input.prescriptionId },
          },
        });

        return claim;
      }),

    /**
     * Resolve rejection (resubmit, override, or convert to cash)
     */
    resolve: pharmacistLevelProcedure
      .input(
        z.object({
          claimId: z.string(),
          action: z.enum(['resubmit', 'override', 'cash', 'prior_auth']),
          overrideCode: z.string().optional(),
          overrideReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const claim = await ctx.db.claimTransaction.findUnique({
          where: { id: input.claimId },
          include: { prescription: true },
        });

        if (!claim) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Claim not found' });
        }

        if (input.action === 'cash') {
          // Convert to cash - move prescription to filling
          await ctx.db.prescription.update({
            where: { id: claim.prescriptionId },
            data: {
              workflowState: 'FILLING',
              insurancePlanId: null,
            },
          });

          await ctx.db.claimTransaction.update({
            where: { id: input.claimId },
            data: { status: 'REVERSED' },
          });
        } else if (input.action === 'prior_auth') {
          await ctx.db.prescription.update({
            where: { id: claim.prescriptionId },
            data: { workflowState: 'PRIOR_AUTH_PENDING' },
          });
        } else {
          // Resubmit or override - update claim and keep in pending
          await ctx.db.claimTransaction.update({
            where: { id: input.claimId },
            data: {
              status: 'PENDING',
              submissionClarificationCode: input.overrideCode,
            },
          });
        }

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'ClaimTransaction',
            resourceId: input.claimId,
            userId: ctx.user.id,
            details: { action: input.action, overrideCode: input.overrideCode },
          },
        });

        return { success: true };
      }),

    /**
     * Calculate cash price
     */
    calculateCash: techLevelProcedure
      .input(
        z.object({
          drugId: z.string(),
          quantity: z.number().positive(),
        })
      )
      .query(async ({ ctx, input }) => {
        const drug = await ctx.db.drug.findUnique({
          where: { id: input.drugId },
        });

        if (!drug) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Drug not found' });
        }

        // Calculate cash price
        const acquisitionCost = (drug.awpPrice ?? 0) * 0.85 * input.quantity;
        const dispensingFee = 12.00;
        const markup = acquisitionCost * 0.20;
        const totalPrice = Math.max(acquisitionCost + markup + dispensingFee, 5.00);

        return {
          acquisitionCost: Math.round(acquisitionCost * 100) / 100,
          markup: Math.round(markup * 100) / 100,
          dispensingFee,
          totalPrice: Math.round(totalPrice * 100) / 100,
        };
      }),
  }),

  // ============================================================================
  // FILL
  // ============================================================================

  fill: router({
    /**
     * Get prescriptions ready for filling
     */
    list: techLevelProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const prescriptions = await ctx.db.prescription.findMany({
          take: input.limit,
          where: { workflowState: 'FILLING' },
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
            drug: true,
            prescriber: { select: { lastName: true, firstName: true } },
          },
          orderBy: [{ priority: 'asc' }, { promiseTime: 'asc' }],
        });

        return prescriptions;
      }),

    /**
     * Assign prescription to technician
     */
    assign: techLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: { assignedToId: staff.id },
        });

        return prescription;
      }),

    /**
     * Start filling a prescription (create fill record)
     */
    start: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          inventoryId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
          include: { drug: true, fills: { orderBy: { fillNumber: 'desc' }, take: 1 } },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        const fillNumber = (prescription.fills[0]?.fillNumber ?? -1) + 1;

        // Create fill record
        const fill = await ctx.db.prescriptionFill.create({
          data: {
            prescriptionId: input.prescriptionId,
            fillNumber,
            inventoryId: input.inventoryId,
            dispensedNdc: prescription.drugNdc ?? '',
            dispensedDrugName: prescription.drug?.displayName ?? prescription.drugName,
            quantityDispensed: prescription.quantityWritten,
            daysSupply: prescription.daysSupply,
            enteredById: staff.id,
            filledById: staff.id,
            status: 'filling',
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'PRESCRIPTION_FILL',
            resourceType: 'PrescriptionFill',
            resourceId: fill.id,
            userId: ctx.user.id,
            details: { prescriptionId: input.prescriptionId, fillNumber },
          },
        });

        return fill;
      }),

    /**
     * Scan NDC barcode
     */
    scanNdc: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          scannedNdc: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
          include: { prescription: { include: { drug: true } } },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        // Normalize NDCs for comparison
        const normalizedScanned = input.scannedNdc.replace(/\D/g, '').padStart(11, '0');
        const expectedNdc = fill.prescription.drugNdc?.replace(/\D/g, '').padStart(11, '0');

        if (normalizedScanned !== expectedNdc) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `NDC mismatch. Expected: ${expectedNdc}, Scanned: ${normalizedScanned}`,
          });
        }

        const updated = await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: { dispensedNdc: normalizedScanned },
        });

        return { verified: true, ndc: normalizedScanned };
      }),

    /**
     * Complete fill (move to verification)
     */
    complete: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          lotNumber: z.string().optional(),
          expirationDate: z.date().optional(),
          auxiliaryLabels: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        // Update fill record
        const updatedFill = await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: {
            status: 'filled',
            filledAt: new Date(),
            lotNumber: input.lotNumber,
            expirationDate: input.expirationDate,
            auxiliaryLabels: input.auxiliaryLabels?.join(','),
          },
        });

        // Update prescription state
        await ctx.db.prescription.update({
          where: { id: fill.prescriptionId },
          data: {
            workflowState: 'VERIFICATION',
            stateHistory: {
              create: {
                fromState: 'FILLING',
                toState: 'VERIFICATION',
                changedById: staff.id,
                reason: 'Fill completed, ready for verification',
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: { action: 'completeFill', lotNumber: input.lotNumber },
          },
        });

        return updatedFill;
      }),
  }),

  // ============================================================================
  // VERIFICATION (Pharmacist Only)
  // ============================================================================

  verify: router({
    /**
     * Get prescriptions awaiting verification
     */
    list: pharmacistLevelProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const prescriptions = await ctx.db.prescription.findMany({
          take: input.limit,
          where: { workflowState: 'VERIFICATION' },
          include: {
            patient: true,
            drug: true,
            prescriber: { select: { firstName: true, lastName: true, npiNumber: true } },
            fills: {
              where: { status: 'filled' },
              orderBy: { fillNumber: 'desc' },
              take: 1,
              include: {
                filledBy: { include: { user: { select: { firstName: true, lastName: true } } } },
              },
            },
            durAlerts: { where: { isOverridden: false } },
          },
          orderBy: [{ priority: 'asc' }, { promiseTime: 'asc' }],
        });

        return prescriptions;
      }),

    /**
     * Start verification (assign to pharmacist)
     */
    start: pharmacistLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: { assignedToId: staff.id },
          include: {
            patient: true,
            drug: true,
            prescriber: true,
            fills: { where: { status: 'filled' }, orderBy: { fillNumber: 'desc' }, take: 1 },
            durAlerts: { where: { isOverridden: false } },
          },
        });

        return prescription;
      }),

    /**
     * Get DUR alerts for prescription
     */
    getDurAlerts: pharmacistLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const alerts = await ctx.db.prescriptionDURAlert.findMany({
          where: { prescriptionId: input.prescriptionId },
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        });

        return alerts;
      }),

    /**
     * Override DUR alert
     */
    overrideDur: pharmacistLevelProcedure
      .input(
        z.object({
          alertId: z.string(),
          overrideCode: z.string(),
          overrideReason: z.string().min(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const alert = await ctx.db.prescriptionDURAlert.update({
          where: { id: input.alertId },
          data: {
            isOverridden: true,
            overriddenById: staff.id,
            overriddenAt: new Date(),
            overrideReason: input.overrideReason,
            overrideCode: input.overrideCode,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PrescriptionDURAlert',
            resourceId: input.alertId,
            userId: ctx.user.id,
            details: {
              action: 'overrideDUR',
              overrideCode: input.overrideCode,
              reason: input.overrideReason,
            },
          },
        });

        return alert;
      }),

    /**
     * Approve verification (move to ready)
     */
    approve: pharmacistLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          fillId: z.string(),
          verificationData: z.record(z.boolean()).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        // Update fill record
        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: {
            status: 'verified',
            verificationStatus: 'approved',
            verifiedById: staff.id,
            verifiedAt: new Date(),
            verificationData: input.verificationData,
          },
        });

        // Update prescription state
        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            workflowState: 'READY',
            lastFilledDate: new Date(),
            stateHistory: {
              create: {
                fromState: 'VERIFICATION',
                toState: 'READY',
                changedById: staff.id,
                reason: 'Pharmacist verification approved',
                notes: input.notes,
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'PRESCRIPTION_VERIFY',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'approve', fillId: input.fillId },
          },
        });

        return prescription;
      }),

    /**
     * Reject verification (return to filling)
     */
    reject: pharmacistLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          fillId: z.string(),
          reason: z.string().min(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        // Update fill record
        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: {
            status: 'pending',
            verificationStatus: 'rejected',
            verifiedById: staff.id,
            verifiedAt: new Date(),
          },
        });

        // Update prescription state
        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            workflowState: 'FILLING',
            stateHistory: {
              create: {
                fromState: 'VERIFICATION',
                toState: 'FILLING',
                changedById: staff.id,
                reason: 'Verification rejected',
                notes: input.reason,
              },
            },
            notes: {
              create: {
                noteType: 'WORKFLOW',
                content: `Verification rejected: ${input.reason}`,
                createdById: staff.id,
                isPriority: true,
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'PRESCRIPTION_VERIFY',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'reject', fillId: input.fillId, reason: input.reason },
          },
        });

        return prescription;
      }),
  }),

  // ============================================================================
  // DISPENSE / PICKUP
  // ============================================================================

  dispense: router({
    /**
     * Get prescriptions ready for pickup
     */
    ready: techLevelProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const prescriptions = await ctx.db.prescription.findMany({
          take: input.limit,
          where: { workflowState: 'READY' },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true, mrn: true } },
            drug: { select: { displayName: true, strength: true, deaSchedule: true } },
            fills: {
              where: { status: 'verified' },
              orderBy: { fillNumber: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'asc' },
        });

        return prescriptions;
      }),

    /**
     * Search patients for pickup
     */
    searchPatient: techLevelProcedure
      .input(
        z.object({
          lastName: z.string().min(2),
          firstInitial: z.string().min(1).optional(),
          dob: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const patients = await ctx.db.patient.findMany({
          take: 20,
          where: {
            lastName: { startsWith: input.lastName },
            ...(input.firstInitial && { firstName: { startsWith: input.firstInitial } }),
            ...(input.dob && { dateOfBirth: input.dob }),
          },
          include: {
            prescriptions: {
              where: { workflowState: 'READY' },
              include: {
                drug: { select: { displayName: true, strength: true, deaSchedule: true } },
              },
            },
          },
        });

        return patients;
      }),

    /**
     * Start pickup session
     */
    startPickup: techLevelProcedure
      .input(
        z.object({
          patientId: z.string(),
          sessionType: z.enum(['RETAIL', 'DRIVE_THRU', 'DELIVERY', 'CURBSIDE', 'MAIL']).default('RETAIL'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const session = await ctx.db.pickupSession.create({
          data: {
            patientId: input.patientId,
            sessionType: input.sessionType,
            status: 'IN_PROGRESS',
            startedById: staff.id,
          },
          include: {
            patient: true,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PickupSession',
            resourceId: session.id,
            userId: ctx.user.id,
            details: { patientId: input.patientId, sessionType: input.sessionType },
          },
        });

        return session;
      }),

    /**
     * Verify patient identity
     */
    verifyPatient: techLevelProcedure
      .input(
        z.object({
          sessionId: z.string(),
          verificationMethod: z.enum(['DOB', 'ADDRESS', 'PHOTO']),
          verified: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.db.pickupSession.update({
          where: { id: input.sessionId },
          data: {
            patientVerified: input.verified,
            verificationMethod: input.verificationMethod,
          },
        });

        return session;
      }),

    /**
     * Verify ID (for controlled substances)
     */
    verifyId: techLevelProcedure
      .input(
        z.object({
          sessionId: z.string(),
          idType: z.enum(['DRIVERS_LICENSE', 'STATE_ID', 'PASSPORT', 'MILITARY_ID', 'TRIBAL_ID', 'PATIENT_PHOTO', 'BIOMETRIC']),
          idNumber: z.string().max(4), // Last 4 only
          idState: z.string().optional(),
          idExpiration: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.db.pickupSession.update({
          where: { id: input.sessionId },
          data: {
            idVerified: true,
            idType: input.idType,
            idNumber: input.idNumber,
            idState: input.idState,
            idExpiration: input.idExpiration,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PickupSession',
            resourceId: input.sessionId,
            userId: ctx.user.id,
            details: { action: 'verifyId', idType: input.idType },
          },
        });

        return session;
      }),

    /**
     * Capture signature
     */
    captureSignature: techLevelProcedure
      .input(
        z.object({
          sessionId: z.string(),
          signatureData: z.string(), // Base64 encoded
          signatureReason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.db.pickupSession.update({
          where: { id: input.sessionId },
          data: {
            signatureCaptured: true,
            signatureData: input.signatureData,
            signatureTimestamp: new Date(),
            signatureReason: input.signatureReason,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'SIGNATURE_CAPTURE',
            resourceType: 'PickupSession',
            resourceId: input.sessionId,
            userId: ctx.user.id,
            details: { signatureReason: input.signatureReason },
          },
        });

        return session;
      }),

    /**
     * Complete pickup
     */
    complete: techLevelProcedure
      .input(
        z.object({
          sessionId: z.string(),
          prescriptionIds: z.array(z.string()),
          paymentMethod: z.string().optional(),
          paymentAmount: z.number().optional(),
          counselingOffered: z.boolean().default(true),
          counselingAccepted: z.boolean().optional(),
          counselingWaived: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        // Update session
        const session = await ctx.db.pickupSession.update({
          where: { id: input.sessionId },
          data: {
            status: 'COMPLETED',
            completedById: staff.id,
            completedAt: new Date(),
            paymentMethod: input.paymentMethod,
            amountPaid: input.paymentAmount ?? 0,
            counselingOffered: input.counselingOffered,
            counselingAccepted: input.counselingAccepted,
            counselingWaived: input.counselingWaived,
          },
        });

        // Update all prescriptions to SOLD
        for (const prescriptionId of input.prescriptionIds) {
          await ctx.db.prescription.update({
            where: { id: prescriptionId },
            data: {
              workflowState: 'SOLD',
              stateHistory: {
                create: {
                  fromState: 'READY',
                  toState: 'SOLD',
                  changedById: staff.id,
                  reason: 'Picked up by patient',
                },
              },
            },
          });

          // Update fill record
          await ctx.db.prescriptionFill.updateMany({
            where: { prescriptionId, status: 'verified' },
            data: {
              status: 'sold',
              soldById: staff.id,
              soldAt: new Date(),
              pickupSessionId: input.sessionId,
            },
          });

          // Log audit
          await ctx.db.auditLog.create({
            data: {
              action: 'PRESCRIPTION_DISPENSE',
              resourceType: 'Prescription',
              resourceId: prescriptionId,
              userId: ctx.user.id,
              details: { sessionId: input.sessionId },
            },
          });
        }

        return session;
      }),

    /**
     * Get will-call bins (prescriptions ready for pickup in bins)
     */
    getWillCallBins: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const fills = await ctx.db.prescriptionFill.findMany({
          take: input.limit,
          where: {
            status: 'verified',
            prescription: {
              workflowState: 'READY',
            },
          },
          include: {
            prescription: {
              include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                drug: { select: { displayName: true, deaSchedule: true } },
              },
            },
          },
          orderBy: { verifiedAt: 'asc' },
        });

        return fills.map((fill) => ({
          id: fill.id,
          binLocation: fill.binLocation ?? 'A1',
          prescriptionId: fill.prescriptionId,
          prescription: fill.prescription,
          patientPayAmount: fill.patientPayAmount,
          verifiedAt: fill.verifiedAt,
          filledAt: fill.filledAt,
        }));
      }),

    /**
     * Return prescription to stock (from will-call)
     */
    returnToStock: pharmacistLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
          include: { prescription: true },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: {
            status: 'returned',
            returnedAt: new Date(),
            returnedById: staff.id,
            returnReason: input.reason ?? 'Patient did not pick up',
          },
        });

        await ctx.db.prescription.update({
          where: { id: fill.prescriptionId },
          data: {
            workflowState: 'RETURNED_TO_STOCK',
            stateHistory: {
              create: {
                fromState: 'READY',
                toState: 'RETURNED_TO_STOCK',
                changedById: staff.id,
                reason: input.reason ?? 'Patient did not pick up - returned to stock',
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'PRESCRIPTION_RETURN',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: { action: 'returnToStock', reason: input.reason },
          },
        });

        return { success: true };
      }),

    /**
     * Extend hold period for will-call bin
     */
    extendHold: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          days: z.number().min(1).max(14).default(7),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        const currentDate = fill.verifiedAt ?? new Date();
        const newDate = new Date(currentDate.getTime() + input.days * 24 * 60 * 60 * 1000);

        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: { verifiedAt: newDate },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: { action: 'extendHold', days: input.days },
          },
        });

        return { success: true, newDate };
      }),

    /**
     * Send notification to patient for pickup
     */
    sendNotification: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          method: z.enum(['sms', 'call', 'email']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
          include: {
            prescription: {
              include: {
                patient: { select: { phone: true, email: true, firstName: true } },
              },
            },
          },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        await ctx.db.auditLog.create({
          data: {
            action: 'NOTIFICATION_SENT',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: {
              method: input.method,
              patientName: fill.prescription.patient?.firstName,
              phone: fill.prescription.patient?.phone,
            },
          },
        });

        return { success: true, method: input.method };
      }),
  }),

  // ============================================================================
  // PRESCRIPTION MANAGEMENT
  // ============================================================================

  prescription: router({
    /**
     * Get prescription by ID with full details
     */
    getById: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.id },
          include: {
            patient: true,
            prescriber: true,
            drug: true,
            insurancePlan: true,
            assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
            fills: { orderBy: { fillNumber: 'desc' } },
            claims: { orderBy: { createdAt: 'desc' } },
            notes: { orderBy: { createdAt: 'desc' } },
            durAlerts: true,
            stateHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
          },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        return prescription;
      }),

    /**
     * Get prescription history (state changes)
     */
    getHistory: techLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const history = await ctx.db.prescriptionStateHistory.findMany({
          where: { prescriptionId: input.prescriptionId },
          include: {
            changedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { changedAt: 'desc' },
        });

        return history;
      }),

    /**
     * Add note to prescription
     */
    addNote: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          noteType: z.enum(['GENERAL', 'CLINICAL', 'INSURANCE', 'PATIENT_REQUEST', 'PRESCRIBER_COMM', 'DUR_OVERRIDE', 'WORKFLOW']).default('GENERAL'),
          content: z.string().min(1),
          isPriority: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        const note = await ctx.db.prescriptionNote.create({
          data: {
            prescriptionId: input.prescriptionId,
            noteType: input.noteType,
            content: input.content,
            isPriority: input.isPriority,
            createdById: staff?.id,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PrescriptionNote',
            resourceId: note.id,
            userId: ctx.user.id,
            details: { prescriptionId: input.prescriptionId, noteType: input.noteType },
          },
        });

        return note;
      }),

    /**
     * Put prescription on hold
     */
    hold: pharmacistLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          reason: z.string().min(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            isOnHold: true,
            holdReason: input.reason,
            notes: {
              create: {
                noteType: 'WORKFLOW',
                content: `Placed on hold: ${input.reason}`,
                createdById: staff.id,
                isPriority: true,
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'hold', reason: input.reason },
          },
        });

        return prescription;
      }),

    /**
     * Remove hold from prescription
     */
    removeHold: pharmacistLevelProcedure
      .input(z.object({ prescriptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            isOnHold: false,
            holdReason: null,
            notes: {
              create: {
                noteType: 'WORKFLOW',
                content: 'Hold removed',
                createdById: staff.id,
              },
            },
          },
        });

        return prescription;
      }),

    /**
     * Cancel prescription
     */
    cancel: pharmacistLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          reason: z.string().min(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const currentPrescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
        });

        if (!currentPrescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        const prescription = await ctx.db.prescription.update({
          where: { id: input.prescriptionId },
          data: {
            workflowState: 'CANCELLED',
            stateHistory: {
              create: {
                fromState: currentPrescription.workflowState,
                toState: 'CANCELLED',
                changedById: staff.id,
                reason: input.reason,
              },
            },
            notes: {
              create: {
                noteType: 'WORKFLOW',
                content: `Prescription cancelled: ${input.reason}`,
                createdById: staff.id,
                isPriority: true,
              },
            },
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: { action: 'cancel', reason: input.reason },
          },
        });

        return prescription;
      }),
  }),

  // ============================================================================
  // WILL-CALL MANAGEMENT (Extended Dispense Functions)
  // ============================================================================

  willCall: router({
    /**
     * Get will-call bins with prescriptions ready for pickup
     */
    getBins: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          status: z.enum(['ready', 'notified', 'expiring', 'return_pending', 'all']).default('all'),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, status } = input;

        // Calculate date thresholds
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

        const whereClause: Record<string, unknown> = {
          status: 'verified',
          prescription: {
            workflowState: 'READY',
          },
        };

        if (status === 'expiring') {
          whereClause.verifiedAt = { lte: sevenDaysAgo, gt: tenDaysAgo };
        } else if (status === 'return_pending') {
          whereClause.verifiedAt = { lte: tenDaysAgo };
        }

        const fills = await ctx.db.prescriptionFill.findMany({
          take: limit,
          where: whereClause,
          include: {
            prescription: {
              include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                drug: { select: { displayName: true, deaSchedule: true } },
              },
            },
          },
          orderBy: { verifiedAt: 'asc' },
        });

        return fills.map((fill) => ({
          id: fill.id,
          binLocation: fill.binLocation ?? 'A1',
          prescriptionId: fill.prescriptionId,
          prescription: fill.prescription,
          patientPayAmount: fill.patientPayAmount,
          verifiedAt: fill.verifiedAt,
          filledAt: fill.filledAt,
          daysInBin: fill.verifiedAt
            ? Math.floor((now.getTime() - new Date(fill.verifiedAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        }));
      }),

    /**
     * Return prescription to stock (reverse from will-call)
     */
    returnToStock: pharmacistLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!staff) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be pharmacy staff' });
        }

        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
          include: { prescription: true },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        // Update fill to returned status
        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: {
            status: 'returned',
            returnedAt: new Date(),
            returnedById: staff.id,
            returnReason: input.reason ?? 'Patient did not pick up',
          },
        });

        // Update prescription state
        await ctx.db.prescription.update({
          where: { id: fill.prescriptionId },
          data: {
            workflowState: 'RETURNED_TO_STOCK',
            stateHistory: {
              create: {
                fromState: 'READY',
                toState: 'RETURNED_TO_STOCK',
                changedById: staff.id,
                reason: input.reason ?? 'Patient did not pick up - returned to stock',
              },
            },
          },
        });

        // Restore inventory if tracking
        if (fill.inventoryId) {
          await ctx.db.inventoryItem.update({
            where: { id: fill.inventoryId },
            data: {
              quantityOnHand: { increment: fill.quantityDispensed },
            },
          });
        }

        await ctx.db.auditLog.create({
          data: {
            action: 'PRESCRIPTION_RETURN',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: { action: 'returnToStock', reason: input.reason },
          },
        });

        return { success: true };
      }),

    /**
     * Extend hold period for will-call bin
     */
    extendHold: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          days: z.number().min(1).max(14).default(7),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        // Extend by updating verified date forward
        const currentDate = fill.verifiedAt ?? new Date();
        const newDate = new Date(currentDate.getTime() + input.days * 24 * 60 * 60 * 1000);

        await ctx.db.prescriptionFill.update({
          where: { id: input.fillId },
          data: { verifiedAt: newDate },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: { action: 'extendHold', days: input.days },
          },
        });

        return { success: true, newDate };
      }),

    /**
     * Send notification to patient for pickup
     */
    sendNotification: techLevelProcedure
      .input(
        z.object({
          fillId: z.string(),
          method: z.enum(['sms', 'call', 'email']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fill = await ctx.db.prescriptionFill.findUnique({
          where: { id: input.fillId },
          include: {
            prescription: {
              include: {
                patient: { select: { phone: true, email: true, firstName: true } },
              },
            },
          },
        });

        if (!fill) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fill not found' });
        }

        // In production, this would integrate with a notification service
        // For now, log the notification attempt

        await ctx.db.auditLog.create({
          data: {
            action: 'NOTIFICATION_SENT',
            resourceType: 'PrescriptionFill',
            resourceId: input.fillId,
            userId: ctx.user.id,
            details: {
              method: input.method,
              patientName: fill.prescription.patient?.firstName,
              phone: fill.prescription.patient?.phone,
            },
          },
        });

        return { success: true, method: input.method };
      }),
  }),

  // ============================================================================
  // LABEL PRINTING
  // ============================================================================

  print: router({
    /**
     * Generate prescription label ZPL
     */
    generateLabel: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          fillId: z.string().optional(),
          labelType: z.enum(['prescription', 'auxiliary', 'patient', 'bin']).default('prescription'),
          copies: z.number().min(1).max(10).default(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
          include: {
            patient: true,
            prescriber: true,
            drug: true,
            fills: input.fillId
              ? { where: { id: input.fillId } }
              : { orderBy: { fillNumber: 'desc' }, take: 1 },
          },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        const fill = prescription.fills[0];

        // Generate ZPL based on label type
        // This would use the ZPL generator from medscab package
        const labelData = {
          patientName: `${prescription.patient?.lastName}, ${prescription.patient?.firstName}`,
          patientDob: prescription.patient?.dateOfBirth?.toLocaleDateString(),
          patientAddress: prescription.patient?.address,
          rxNumber: prescription.rxNumber,
          drugName: prescription.drug?.displayName ?? prescription.drugName,
          drugStrength: prescription.strength,
          drugForm: prescription.dosageForm,
          ndc: prescription.drugNdc,
          quantity: prescription.quantityWritten,
          daysSupply: prescription.daysSupply,
          directions: prescription.directions,
          refillsRemaining: prescription.refillsRemaining ?? 0,
          refillsAuthorized: prescription.refillsAuthorized ?? 0,
          fillDate: fill?.filledAt ?? new Date(),
          expirationDate: prescription.expirationDate,
          prescriberName: `${prescription.prescriber?.lastName}, ${prescription.prescriber?.firstName}`,
          prescriberPhone: prescription.prescriber?.phone,
          pharmacyName: 'Xoai Pharmacy',
          pharmacyAddress: '123 Healthcare Blvd, Suite 100',
          pharmacyPhone: '(555) 123-4567',
          isControlled: prescription.isControlled,
          deaSchedule: prescription.deaSchedule,
          auxiliaryLabels: fill?.auxiliaryLabels?.split(',') ?? [],
        };

        await ctx.db.auditLog.create({
          data: {
            action: 'LABEL_PRINT',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: {
              labelType: input.labelType,
              copies: input.copies,
              fillId: fill?.id,
            },
          },
        });

        return {
          labelData,
          copies: input.copies,
          labelType: input.labelType,
        };
      }),

    /**
     * Generate batch labels
     */
    batchLabels: techLevelProcedure
      .input(
        z.object({
          labels: z.array(
            z.object({
              prescriptionId: z.string(),
              fillId: z.string().optional(),
              labelType: z.enum(['prescription', 'auxiliary', 'patient', 'bin']),
              copies: z.number().min(1).max(10).default(1),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const results = [];

        for (const labelRequest of input.labels) {
          const prescription = await ctx.db.prescription.findUnique({
            where: { id: labelRequest.prescriptionId },
            include: {
              patient: true,
              prescriber: true,
              drug: true,
              fills: labelRequest.fillId
                ? { where: { id: labelRequest.fillId } }
                : { orderBy: { fillNumber: 'desc' }, take: 1 },
            },
          });

          if (!prescription) continue;

          const fill = prescription.fills[0];

          results.push({
            prescriptionId: labelRequest.prescriptionId,
            labelType: labelRequest.labelType,
            copies: labelRequest.copies,
            labelData: {
              patientName: `${prescription.patient?.lastName}, ${prescription.patient?.firstName}`,
              rxNumber: prescription.rxNumber,
              drugName: prescription.drug?.displayName ?? prescription.drugName,
              quantity: prescription.quantityWritten,
              directions: prescription.directions,
              fillDate: fill?.filledAt ?? new Date(),
            },
          });
        }

        await ctx.db.auditLog.create({
          data: {
            action: 'LABEL_BATCH_PRINT',
            resourceType: 'Prescription',
            resourceId: input.labels[0]?.prescriptionId ?? '',
            userId: ctx.user.id,
            details: { labelCount: input.labels.length },
          },
        });

        return { labels: results };
      }),

    /**
     * Reprint label
     */
    reprint: techLevelProcedure
      .input(
        z.object({
          prescriptionId: z.string(),
          fillId: z.string().optional(),
          reason: z.string().min(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prescription = await ctx.db.prescription.findUnique({
          where: { id: input.prescriptionId },
          include: {
            patient: true,
            prescriber: true,
            drug: true,
          },
        });

        if (!prescription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription not found' });
        }

        await ctx.db.auditLog.create({
          data: {
            action: 'LABEL_REPRINT',
            resourceType: 'Prescription',
            resourceId: input.prescriptionId,
            userId: ctx.user.id,
            details: {
              reason: input.reason,
              fillId: input.fillId,
            },
          },
        });

        return {
          success: true,
          labelData: {
            patientName: `${prescription.patient?.lastName}, ${prescription.patient?.firstName}`,
            rxNumber: prescription.rxNumber,
            drugName: prescription.drug?.displayName ?? prescription.drugName,
          },
        };
      }),
  }),
});
