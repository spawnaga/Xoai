import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['PHARMACIST', 'PHARMACY_TECH', 'NURSE', 'DOCTOR']),
  pharmacyRole: z.enum([
    'PHARMACIST',
    'STAFF_PHARMACIST',
    'PHARMACY_INTERN',
    'PHARMACY_TECH_LEAD',
    'PHARMACY_TECH',
    'TECH_IN_TRAINING',
  ]).optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  npiNumber: z.string().optional(),
  deaNumber: z.string().optional(),
});

export const userManagementRouter = router({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if requester is master user
      if (!ctx.user || !ctx.user.isSuperuser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only master user can create accounts',
        });
      }

      // Check if username exists
      const existing = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          username: input.username,
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          name: `${input.firstName} ${input.lastName}`,
          role: input.role,
          isPharmacist: input.role === 'PHARMACIST',
          isPharmacyTechnician: input.role === 'PHARMACY_TECH',
          isDoctor: input.role === 'DOCTOR',
          npiNumber: input.npiNumber,
          deaNumber: input.deaNumber,
          licenseNumber: input.licenseNumber,
          isActive: true,
          ...(input.pharmacyRole && {
            pharmacyStaff: {
              create: {
                role: input.pharmacyRole,
                permissionLevel: input.pharmacyRole === 'PHARMACIST' ? 4 : 8,
                licenseNumber: input.licenseNumber,
                npiNumber: input.npiNumber,
                deaNumber: input.deaNumber,
                isActive: true,
              },
            },
          }),
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { username: input.username, role: input.role },
        },
      });

      return { id: user.id, username: user.username };
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user || !ctx.user.isSuperuser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only master user can list users',
      });
    }

    return ctx.db.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        isPharmacist: true,
        isPharmacyTechnician: true,
        createdAt: true,
        pharmacyStaff: {
          select: {
            role: true,
            licenseNumber: true,
            npiNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  deactivate: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.isSuperuser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only master user can deactivate users',
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { isActive: false },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { action: 'deactivate' },
        },
      });

      return user;
    }),

  reactivate: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.isSuperuser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only master user can reactivate users',
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { isActive: true },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { action: 'reactivate' },
        },
      });

      return user;
    }),

  updateInfo: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        npiNumber: z.string().optional(),
        deaNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.isSuperuser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only master user can update user info',
        });
      }

      const { userId, ...data } = input;

      const user = await ctx.db.user.update({
        where: { id: userId },
        data,
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { updated: Object.keys(data) },
        },
      });

      return user;
    }),
});
