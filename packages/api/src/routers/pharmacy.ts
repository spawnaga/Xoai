import { z } from 'zod';
import {
  router,
  protectedProcedure,
  pharmacistLevelProcedure,
  techLevelProcedure,
  managerProcedure,
  masterUserProcedure,
} from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Pharmacy Router - Comprehensive pharmacy operations
 * Includes: Staff, Prescriptions, PDMP, Immunizations, Inventory, Will-Call
 */
export const pharmacyRouter = router({
  // ============================================================================
  // PHARMACY STAFF MANAGEMENT
  // ============================================================================

  staff: router({
    // Get current staff profile
    me: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.pharmacyStaff.findUnique({
        where: { userId: ctx.user.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          supervisor: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
    }),

    // Get staff by ID
    getById: managerProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.pharmacyStaff.findUnique({
          where: { id: input.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },
            supervisor: true,
            supervisees: true,
          },
        });

      }),

    // List all staff
    list: managerProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().nullish(),
          role: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, cursor, role } = input;

        const staff = await ctx.db.pharmacyStaff.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: role ? { role: role as never } : undefined,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
          },
          orderBy: { permissionLevel: 'asc' },
        });

        let nextCursor: typeof cursor = undefined;
        if (staff.length > limit) {
          const nextItem = staff.pop();
          nextCursor = nextItem?.id;
        }
        return { items: staff, nextCursor };
      }),

    // Create staff record
    create: masterUserProcedure
      .input(
        z.object({
          userId: z.string(),
          role: z.enum([
            'MASTER_USER', 'SYSTEM_ADMIN', 'COMPUTER_TECH', 'PHARMACY_MANAGER',
            'PHARMACIST', 'STAFF_PHARMACIST', 'PHARMACY_INTERN',
            'PHARMACY_TECH_LEAD', 'PHARMACY_TECH', 'TECH_IN_TRAINING',
            'CASHIER', 'DELIVERY_DRIVER',
          ]),
          permissionLevel: z.number().min(0).max(10).optional(),
          licenseNumber: z.string().optional(),
          licenseState: z.string().optional(),
          supervisorId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.create({ data: input });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PharmacyStaff',
            resourceId: staff.id,
            userId: ctx.user.id,
            details: { role: input.role },
          },
        });

        return staff;
      }),

    // Update staff record
    update: masterUserProcedure
      .input(
        z.object({
          id: z.string(),
          role: z.enum([
            'MASTER_USER', 'SYSTEM_ADMIN', 'COMPUTER_TECH', 'PHARMACY_MANAGER',
            'PHARMACIST', 'STAFF_PHARMACIST', 'PHARMACY_INTERN',
            'PHARMACY_TECH_LEAD', 'PHARMACY_TECH', 'TECH_IN_TRAINING',
            'CASHIER', 'DELIVERY_DRIVER',
          ]).optional(),
          permissionLevel: z.number().min(0).max(10).optional(),
          licenseNumber: z.string().optional(),
          licenseState: z.string().optional(),
          supervisorId: z.string().nullish(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const staff = await ctx.db.pharmacyStaff.update({ where: { id }, data });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PharmacyStaff',
            resourceId: staff.id,
            userId: ctx.user.id,
            details: { fields: Object.keys(data) },
          },
        });

        return staff;
      }),
  }),

  // ============================================================================
  // PRESCRIPTION INTAKE
  // ============================================================================

  intake: router({
    // List prescription intakes
    list: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().nullish(),
          status: z.enum(['PENDING', 'IN_REVIEW', 'CLARIFICATION_NEEDED', 'APPROVED', 'REJECTED', 'TRANSFERRED']).optional(),
          patientId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, cursor, status, patientId } = input;

        const intakes = await ctx.db.prescriptionIntake.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: {
            ...(status && { status }),
            ...(patientId && { patientId }),
          },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
            intakeBy: {
              select: { user: { select: { firstName: true, lastName: true } } },
            },
          },
          orderBy: { intakeAt: 'desc' },
        });

        let nextCursor: typeof cursor = undefined;
        if (intakes.length > limit) {
          const nextItem = intakes.pop();
          nextCursor = nextItem?.id;
        }
        return { items: intakes, nextCursor };
      }),

    // Get intake by ID
    getById: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const intake = await ctx.db.prescriptionIntake.findUnique({
          where: { id: input.id },
          include: {
            patient: true,
            intakeBy: { include: { user: { select: { firstName: true, lastName: true } } } },
            verifiedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        });

        if (!intake) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescription intake not found' });
        }
        return intake;
      }),

    // Create new intake
    create: techLevelProcedure
      .input(
        z.object({
          channel: z.enum(['E_PRESCRIBE', 'FAX', 'PHONE', 'HARD_COPY', 'TRANSFER_IN', 'REFILL_REQUEST', 'EMR_INTEGRATION']),
          sourceIdentifier: z.string().optional(),
          patientId: z.string().optional(),
          patientFirstName: z.string(),
          patientLastName: z.string(),
          patientDOB: z.date(),
          patientPhone: z.string().optional(),
          patientAddress: z.string().optional(),
          prescriberName: z.string(),
          prescriberNPI: z.string().optional(),
          prescriberDEA: z.string().optional(),
          prescriberPhone: z.string().optional(),
          prescriberFax: z.string().optional(),
          prescriberAddress: z.string().optional(),
          drugName: z.string(),
          drugNDC: z.string().optional(),
          quantity: z.number().int(),
          daysSupply: z.number().int().optional(),
          refillsAuthorized: z.number().int().default(0),
          directions: z.string(),
          dawCode: z.number().int().default(0),
          isControlled: z.boolean().default(false),
          schedule: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({ where: { userId: ctx.user.id } });

        const intake = await ctx.db.prescriptionIntake.create({
          data: {
            ...input,
            status: 'PENDING',
            intakeById: staff?.id,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PrescriptionIntake',
            resourceId: intake.id,
            userId: ctx.user.id,
            details: { channel: input.channel, drugName: input.drugName },
          },
        });
        return intake;
      }),

    // Verify intake (pharmacist only)
    verify: pharmacistLevelProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(['APPROVED', 'REJECTED', 'CLARIFICATION_NEEDED']),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({ where: { userId: ctx.user.id } });

        const intake = await ctx.db.prescriptionIntake.update({
          where: { id: input.id },
          data: {
            status: input.status,
            verifiedById: staff?.id,
            verifiedAt: new Date(),
            rejectionReason: input.rejectionReason,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'PrescriptionIntake',
            resourceId: intake.id,
            userId: ctx.user.id,
            details: { action: 'verify', status: input.status },
          },
        });
        return intake;
      }),
  }),

  // ============================================================================
  // PDMP (Prescription Drug Monitoring Program)
  // ============================================================================

  pdmp: router({
    // Query PDMP
    query: pharmacistLevelProcedure
      .input(
        z.object({
          patientId: z.string(),
          queryType: z.enum(['STANDARD', 'EMERGENCY', 'OPIOID_NAIVE', 'HIGH_RISK', 'AUDIT']).default('STANDARD'),
          statesQueried: z.string(), // Comma-separated state codes
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({ where: { userId: ctx.user.id } });


        // Create PDMP query record
        const query = await ctx.db.pDMPQuery.create({
          data: {
            patientId: input.patientId,
            queriedById: staff.id,
            queryType: input.queryType,
            statesQueried: input.statesQueried,
            querySuccessful: true, // TODO: Integrate with actual PDMP API
            prescriptionsFound: 0,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'PHI_VIEW',
            resourceType: 'PDMPQuery',
            resourceId: query.id,
            userId: ctx.user.id,
            details: { patientId: input.patientId, statesQueried: input.statesQueried },
          },
        });
        return query;
      }),

    // Get PDMP history for patient
    history: pharmacistLevelProcedure
      .input(z.object({ patientId: z.string(), limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ ctx, input }) => {
        return ctx.db.pDMPQuery.findMany({
          where: { patientId: input.patientId },
          take: input.limit,
          orderBy: { queriedAt: 'desc' },
          include: {
            queriedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        });
      }),
  }),

  // ============================================================================
  // IMMUNIZATIONS
  // ============================================================================

  immunization: router({
    // List immunization records
    list: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().nullish(),
          patientId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, cursor, patientId } = input;

        const records = await ctx.db.immunizationRecord.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: patientId ? { patientId } : undefined,
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
            vaccineInventory: { select: { vaccineName: true, manufacturer: true, lotNumber: true } },
            administeredBy: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { administrationDate: 'desc' },
        });

        let nextCursor: typeof cursor = undefined;
        if (records.length > limit) {
          const nextItem = records.pop();
          nextCursor = nextItem?.id;
        }
        return { items: records, nextCursor };
      }),

    // Get immunization by ID
    getById: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const record = await ctx.db.immunizationRecord.findUnique({
          where: { id: input.id },
          include: {
            patient: true,
            vaccineInventory: true,
            administeredBy: { include: { user: true } },
            standingOrder: true,
          },
        });

        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Immunization record not found' });
        }
        return record;
      }),

    // Administer vaccine
    administer: pharmacistLevelProcedure
      .input(
        z.object({
          patientId: z.string(),
          vaccineInventoryId: z.string(),
          standingOrderId: z.string().optional(),
          administrationSite: z.string(),
          administrationRoute: z.string(),
          doseNumber: z.number().int().optional(),
          visPublicationDate: z.date().optional(),
          visGivenDate: z.date(),
          screeningCompleted: z.boolean().default(true),
          screeningQuestions: z.record(z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staff = await ctx.db.pharmacyStaff.findUnique({ where: { userId: ctx.user.id } });


        // Check vaccine inventory
        const vaccine = await ctx.db.vaccineInventory.findUnique({ where: { id: input.vaccineInventoryId } });

        if (!vaccine) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Vaccine inventory not found' });
        }

        if (vaccine.quantityOnHand < 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient vaccine inventory' });
        }

        // Create immunization record
        const record = await ctx.db.immunizationRecord.create({
          data: {
            patientId: input.patientId,
            vaccineInventoryId: input.vaccineInventoryId,
            administeredById: staff.id,
            standingOrderId: input.standingOrderId,
            standingOrderUsed: !!input.standingOrderId,
            administrationDate: new Date(),
            administrationSite: input.administrationSite,
            administrationRoute: input.administrationRoute,
            doseNumber: input.doseNumber,
            visPublicationDate: input.visPublicationDate,
            visGivenDate: input.visGivenDate,
            screeningCompleted: input.screeningCompleted,
            screeningQuestions: input.screeningQuestions as any,
          },
        });

        // Decrement inventory
        await ctx.db.vaccineInventory.update({
          where: { id: input.vaccineInventoryId },
          data: { quantityOnHand: { decrement: 1 } },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'ImmunizationRecord',
            resourceId: record.id,
            userId: ctx.user.id,
            details: { patientId: input.patientId, vaccine: vaccine.vaccineName, lotNumber: vaccine.lotNumber },
          },
        });
        return record;
      }),

    // Get patient immunization history
    patientHistory: techLevelProcedure
      .input(z.object({ patientId: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.immunizationRecord.findMany({
          where: { patientId: input.patientId },
          include: {
            vaccineInventory: { select: { vaccineName: true, manufacturer: true } },
            administeredBy: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { administrationDate: 'desc' },
        });
      }),
  }),

  // ============================================================================
  // VACCINE INVENTORY
  // ============================================================================

  inventory: router({
    // List vaccine inventory
    list: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().nullish(),
          expiringSoon: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, cursor, expiringSoon } = input;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const vaccines = await ctx.db.vaccineInventory.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: expiringSoon ? { expirationDate: { lte: thirtyDaysFromNow } } : undefined,
          include: { storageUnit: { select: { name: true, location: true } } },
          orderBy: { expirationDate: 'asc' },
        });

        let nextCursor: typeof cursor = undefined;
        if (vaccines.length > limit) {
          const nextItem = vaccines.pop();
          nextCursor = nextItem?.id;
        }
        return { items: vaccines, nextCursor };
      }),

    // Get vaccine by ID
    getById: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const vaccine = await ctx.db.vaccineInventory.findUnique({
          where: { id: input.id },
          include: {
            storageUnit: true,
            immunizations: { take: 10, orderBy: { administrationDate: 'desc' } },
          },
        });

        if (!vaccine) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Vaccine not found' });
        }
        return vaccine;
      }),

    // Add vaccine to inventory
    add: pharmacistLevelProcedure
      .input(
        z.object({
          cvxCode: z.string(),
          mvxCode: z.string().optional(),
          ndcCode: z.string(),
          vaccineName: z.string(),
          manufacturer: z.string(),
          lotNumber: z.string(),
          expirationDate: z.date(),
          quantityOnHand: z.number().int().min(1),
          dosesPerVial: z.number().int().default(1),
          storageUnitId: z.string().optional(),
          storageRequirement: z.enum(['REFRIGERATED', 'FROZEN', 'ULTRA_COLD', 'ROOM_TEMP']),
          isVfcStock: z.boolean().default(false),
          vfcPinNumber: z.string().optional(),
          fundingSource: z.enum(['PRIVATE', 'VFC', 'STATE_SUPPLIED', 'FEDERAL_317', 'OTHER_PUBLIC']).default('PRIVATE'),
          receivedDate: z.date(),
          receivedFrom: z.string().optional(),
          poNumber: z.string().optional(),
          unitCost: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const vaccine = await ctx.db.vaccineInventory.create({ data: input });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'VaccineInventory',
            resourceId: vaccine.id,
            userId: ctx.user.id,
            details: { vaccineName: input.vaccineName, lotNumber: input.lotNumber, quantity: input.quantityOnHand },
          },
        });
        return vaccine;
      }),

    // Adjust inventory
    adjust: pharmacistLevelProcedure
      .input(
        z.object({
          id: z.string(),
          adjustment: z.number().int(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const vaccine = await ctx.db.vaccineInventory.update({
          where: { id: input.id },
          data: { quantityOnHand: { increment: input.adjustment } },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'VaccineInventory',
            resourceId: vaccine.id,
            userId: ctx.user.id,
            details: { adjustment: input.adjustment, reason: input.reason, newQuantity: vaccine.quantityOnHand },
          },
        });
        return vaccine;
      }),
  }),

  // ============================================================================
  // WILL-CALL / PICKUP
  // ============================================================================

  willCall: router({
    // List will-call bins
    list: techLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          status: z.enum(['EMPTY', 'ASSIGNED', 'READY_FOR_PICKUP', 'PARTIAL_PICKUP', 'AWAITING_PAYMENT', 'SCHEDULED_REVERSE']).optional(),
          patientId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, status, patientId } = input;

        return ctx.db.willCallBin.findMany({
          take: limit,
          where: {
            ...(status && { status }),
            ...(patientId && { patientId }),
          },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phone: true } },
          },
          orderBy: { lastActivityAt: 'desc' },
        });
      }),

    // Assign bin to patient
    assign: techLevelProcedure
      .input(
        z.object({
          binNumber: z.string(),
          patientId: z.string(),
          patientLastName: z.string(),
          prescriptionCount: z.number().int().default(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const bin = await ctx.db.willCallBin.upsert({
          where: { binNumber: input.binNumber },
          update: {
            patientId: input.patientId,
            patientLastName: input.patientLastName,
            prescriptionCount: { increment: input.prescriptionCount },
            status: 'ASSIGNED',
            lastActivityAt: new Date(),
            firstFilledAt: new Date(),
          },
          create: {
            binNumber: input.binNumber,
            patientId: input.patientId,
            patientLastName: input.patientLastName,
            prescriptionCount: input.prescriptionCount,
            status: 'ASSIGNED',
            firstFilledAt: new Date(),
            lastActivityAt: new Date(),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'WillCallBin',
            resourceId: bin.id,
            userId: ctx.user.id,
            details: { patientId: input.patientId, binNumber: input.binNumber },
          },
        });
        return bin;
      }),

    // Mark as ready for pickup
    markReady: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const bin = await ctx.db.willCallBin.update({
          where: { id: input.id },
          data: {
            status: 'READY_FOR_PICKUP',
            lastActivityAt: new Date(),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'WillCallBin',
            resourceId: bin.id,
            userId: ctx.user.id,
            details: { action: 'markReady' },
          },
        });
        return bin;
      }),

    // Clear bin after pickup
    clear: techLevelProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const bin = await ctx.db.willCallBin.update({
          where: { id: input.id },
          data: {
            status: 'EMPTY',
            patientId: null,
            patientLastName: null,
            prescriptionCount: 0,
            firstFilledAt: null,
            lastActivityAt: new Date(),
            scheduledReverseAt: null,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'WillCallBin',
            resourceId: bin.id,
            userId: ctx.user.id,
            details: { action: 'clear' },
          },
        });
        return bin;
      }),

    // Schedule return to stock
    scheduleReverse: pharmacistLevelProcedure
      .input(z.object({ id: z.string(), daysUntilReverse: z.number().int().default(10) }))
      .mutation(async ({ ctx, input }) => {
        const reverseDate = new Date();
        reverseDate.setDate(reverseDate.getDate() + input.daysUntilReverse);

        const bin = await ctx.db.willCallBin.update({
          where: { id: input.id },
          data: {
            status: 'SCHEDULED_REVERSE',
            daysUntilReverse: input.daysUntilReverse,
            scheduledReverseAt: reverseDate,
            lastActivityAt: new Date(),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'WillCallBin',
            resourceId: bin.id,
            userId: ctx.user.id,
            details: { action: 'scheduleReverse', scheduledReverseAt: reverseDate },
          },
        });
        return bin;
      }),
  }),

  // ============================================================================
  // STANDING ORDERS
  // ============================================================================

  standingOrder: router({
    // List standing orders
    list: pharmacistLevelProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20), isActive: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.standingOrder.findMany({
          take: input.limit,
          where: input.isActive !== undefined ? { isActive: input.isActive } : undefined,
          orderBy: { createdAt: 'desc' },
        });
      }),

    // Get standing order by ID
    getById: pharmacistLevelProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const order = await ctx.db.standingOrder.findUnique({
          where: { id: input.id },
          include: { immunizations: { take: 10, orderBy: { administrationDate: 'desc' } } },
        });

        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Standing order not found' });
        }
        return order;
      }),

    // Create standing order
    create: managerProcedure
      .input(
        z.object({
          name: z.string(),
          vaccineTypes: z.string(), // Comma-separated CVX codes
          description: z.string(),
          protocolUrl: z.string().optional(),
          protocolVersion: z.string().optional(),
          prescriberName: z.string(),
          prescriberNPI: z.string(),
          prescriberLicense: z.string(),
          minAge: z.number().int().optional(),
          maxAge: z.number().int().optional(),
          genderRestriction: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
          conditions: z.string().optional(),
          effectiveDate: z.date(),
          expirationDate: z.date(),
          stateCode: z.string().length(2),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const order = await ctx.db.standingOrder.create({
          data: { ...input, isActive: true },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'StandingOrder',
            resourceId: order.id,
            userId: ctx.user.id,
            details: { name: input.name, vaccineTypes: input.vaccineTypes },
          },
        });
        return order;
      }),

    // Deactivate standing order
    deactivate: managerProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const order = await ctx.db.standingOrder.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'StandingOrder',
            resourceId: order.id,
            userId: ctx.user.id,
            details: { action: 'deactivate' },
          },
        });
        return order;
      }),
  }),

  // ============================================================================
  // TEMPERATURE MONITORING
  // ============================================================================

  temperature: router({
    // Log temperature reading
    log: techLevelProcedure
      .input(
        z.object({
          storageUnitId: z.string(),
          temperatureCelsius: z.number(),
          actionsTaken: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check storage unit for temperature range
        const unit = await ctx.db.vaccineStorageUnit.findUnique({ where: { id: input.storageUnitId } });

        if (!unit) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Storage unit not found' });
        }

        const isWithinRange = input.temperatureCelsius >= unit.minTempCelsius && input.temperatureCelsius <= unit.maxTempCelsius;
        const isExcursion = !isWithinRange;

        const log = await ctx.db.temperatureLog.create({
          data: {
            storageUnitId: input.storageUnitId,
            temperatureCelsius: input.temperatureCelsius,
            recordedAt: new Date(),
            recordedBy: ctx.user.id,
            isWithinRange,
            isExcursion,
            actionsTaken: input.actionsTaken,
          },
        });

        // Update storage unit
        await ctx.db.vaccineStorageUnit.update({
          where: { id: input.storageUnitId },
          data: {
            currentTempCelsius: input.temperatureCelsius,
            lastTempReadingAt: new Date(),
            ...(isExcursion && {
              hasActiveExcursion: true,
              lastExcursionAt: new Date(),
              excursionCount: { increment: 1 },
            }),
          },
        });

        if (isExcursion) {
          await ctx.db.auditLog.create({
            data: {
              action: 'UPDATE',
              resourceType: 'TemperatureLog',
              resourceId: log.id,
              userId: ctx.user.id,
              details: {
                alert: 'TEMPERATURE_EXCURSION',
                temperature: input.temperatureCelsius,
                minTemp: unit.minTempCelsius,
                maxTemp: unit.maxTempCelsius,
                unitName: unit.name,
              },
            },
          });
        }
        return log;
      }),

    // Get temperature history
    history: techLevelProcedure
      .input(
        z.object({
          storageUnitId: z.string(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().min(1).max(500).default(100),
        })
      )
      .query(async ({ ctx, input }) => {
        return ctx.db.temperatureLog.findMany({
          where: {
            storageUnitId: input.storageUnitId,
            ...(input.startDate && { recordedAt: { gte: input.startDate } }),
            ...(input.endDate && { recordedAt: { lte: input.endDate } }),
          },
          take: input.limit,
          orderBy: { recordedAt: 'desc' },
        });
      }),
  }),

  // ============================================================================
  // PRESCRIPTION TRANSFERS
  // ============================================================================

  transfer: router({
    // List transfers
    list: pharmacistLevelProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          direction: z.enum(['TRANSFER_IN', 'TRANSFER_OUT']).optional(),
          status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return ctx.db.prescriptionTransfer.findMany({
          take: input.limit,
          where: {
            ...(input.direction && { direction: input.direction }),
            ...(input.status && { status: input.status }),
          },
          include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
          orderBy: { transferredAt: 'desc' },
        });
      }),

    // Initiate transfer out
    initiateOut: pharmacistLevelProcedure
      .input(
        z.object({
          originalRxNumber: z.string(),
          medicationName: z.string(),
          medicationNDC: z.string().optional(),
          quantity: z.number().int(),
          refillsRemaining: z.number().int(),
          patientId: z.string(),
          patientFirstName: z.string(),
          patientLastName: z.string(),
          patientDOB: z.date(),
          otherPharmacyName: z.string(),
          otherPharmacyPhone: z.string(),
          otherPharmacyNPI: z.string().optional(),
          otherPharmacyAddress: z.string().optional(),
          prescriberName: z.string(),
          prescriberNPI: z.string().optional(),
          prescriberDEA: z.string().optional(),
          prescriberPhone: z.string().optional(),
          ourPharmacistName: z.string(),
          theirPharmacistName: z.string().optional(),
          originalWrittenDate: z.date(),
          originalFillDate: z.date().optional(),
          lastFillDate: z.date().optional(),
          totalFillsUsed: z.number().int().default(0),
          isControlled: z.boolean().default(false),
          schedule: z.number().int().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const transfer = await ctx.db.prescriptionTransfer.create({
          data: {
            ...input,
            direction: 'TRANSFER_OUT',
            status: 'COMPLETED',
            ourPharmacistId: ctx.user.id,
            transferredAt: new Date(),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PrescriptionTransfer',
            resourceId: transfer.id,
            userId: ctx.user.id,
            details: { direction: 'TRANSFER_OUT', rxNumber: input.originalRxNumber, toPharmacy: input.otherPharmacyName },
          },
        });
        return transfer;
      }),

    // Record transfer in
    recordIn: pharmacistLevelProcedure
      .input(
        z.object({
          originalRxNumber: z.string(),
          medicationName: z.string(),
          medicationNDC: z.string().optional(),
          quantity: z.number().int(),
          refillsRemaining: z.number().int(),
          patientId: z.string(),
          patientFirstName: z.string(),
          patientLastName: z.string(),
          patientDOB: z.date(),
          otherPharmacyName: z.string(),
          otherPharmacyPhone: z.string(),
          otherPharmacyNPI: z.string().optional(),
          prescriberName: z.string(),
          prescriberNPI: z.string().optional(),
          prescriberDEA: z.string().optional(),
          ourPharmacistName: z.string(),
          theirPharmacistName: z.string(),
          originalWrittenDate: z.date(),
          originalFillDate: z.date().optional(),
          lastFillDate: z.date().optional(),
          totalFillsUsed: z.number().int().default(0),
          isControlled: z.boolean().default(false),
          schedule: z.number().int().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const transfer = await ctx.db.prescriptionTransfer.create({
          data: {
            ...input,
            direction: 'TRANSFER_IN',
            status: 'COMPLETED',
            ourPharmacistId: ctx.user.id,
            transferredAt: new Date(),
          },
        });

        await ctx.db.auditLog.create({
          data: {
            action: 'CREATE',
            resourceType: 'PrescriptionTransfer',
            resourceId: transfer.id,
            userId: ctx.user.id,
            details: { direction: 'TRANSFER_IN', rxNumber: input.originalRxNumber, fromPharmacy: input.otherPharmacyName },
          },
        });
        return transfer;
      }),
  }),
});