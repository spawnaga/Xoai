import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, masterUserProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * User Router - User management operations
 * Requires appropriate permissions for each operation
 */
export const userRouter = router({
  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isSuperuser: true,
        isDoctor: true,
        isPharmacist: true,
        isPharmacyTechnician: true,
        deaNumber: true,
        npiNumber: true,
        licenseNumber: true,
        licenseType: true,
        licenseState: true,
        clinicName: true,
        createdAt: true,
        lastLoginAt: true,
        pharmacyStaff: {
          select: {
            role: true,
            permissionLevel: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  // Get user by ID (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          role: true,
          isSuperuser: true,
          isActive: true,
          isDoctor: true,
          isPharmacist: true,
          isPharmacyTechnician: true,
          deaNumber: true,
          npiNumber: true,
          licenseNumber: true,
          licenseType: true,
          licenseState: true,
          clinicName: true,
          createdAt: true,
          lastLoginAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          pharmacyStaff: {
            select: {
              role: true,
              permissionLevel: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // List all users (admin only)
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        search: z.string().optional(),
        role: z.enum(['USER', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, role, isActive } = input;

      const users = await ctx.db.user.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          ...(search && {
            OR: [
              { username: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          role: true,
          isSuperuser: true,
          isActive: true,
          isDoctor: true,
          isPharmacist: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (users.length > limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: users,
        nextCursor,
      };
    }),

  // Update user profile (self)
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        clinicName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { fields: Object.keys(input) },
        },
      });

      return user;
    }),

  // Update user (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['USER', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT']).optional(),
        isActive: z.boolean().optional(),
        isDoctor: z.boolean().optional(),
        isPharmacist: z.boolean().optional(),
        isPharmacyTechnician: z.boolean().optional(),
        deaNumber: z.string().optional(),
        npiNumber: z.string().optional(),
        licenseNumber: z.string().optional(),
        licenseType: z.string().optional(),
        licenseState: z.string().optional(),
        clinicName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const user = await ctx.db.user.update({
        where: { id },
        data,
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { fields: Object.keys(data), adminAction: true },
        },
      });

      return user;
    }),

  // Set superuser status (master user only)
  setSuperuser: masterUserProcedure
    .input(
      z.object({
        userId: z.string(),
        isSuperuser: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { isSuperuser: input.isSuperuser },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: {
            field: 'isSuperuser',
            newValue: input.isSuperuser,
            criticalAction: true,
          },
        },
      });

      return user;
    }),

  // Unlock user account (admin only)
  unlockAccount: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: user.id,
          userId: ctx.user.id,
          details: { action: 'unlockAccount' },
        },
      });

      return { success: true };
    }),

  // Reset password (admin only)
  resetPassword: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: input.userId,
          userId: ctx.user.id,
          details: { action: 'resetPassword', adminAction: true },
        },
      });

      return { success: true };
    }),

  // Change own password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Import bcryptjs dynamically to avoid bundling issues
      const { compare, hash } = await import('bcryptjs');
      const isValid = await compare(input.currentPassword, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        });
      }

      const hashedPassword = await hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { password: hashedPassword },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'User',
          resourceId: ctx.user.id,
          userId: ctx.user.id,
          details: { action: 'changePassword' },
        },
      });

      return { success: true };
    }),

  // Deactivate user (admin only)
  deactivate: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent self-deactivation
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot deactivate your own account',
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

      return { success: true };
    }),
});