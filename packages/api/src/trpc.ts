import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * User type with all permission-related fields
 */
interface AuthUser {
  id: string;
  role: string;
  isSuperuser?: boolean;
  isDoctor?: boolean;
  isPharmacist?: boolean;
  isPharmacyTechnician?: boolean;
}

/**
 * Permission level constants (from PharmacyRole)
 * Lower number = higher access
 */
export const PermissionLevels = {
  MASTER_USER: 0,
  SYSTEM_ADMIN: 1,
  COMPUTER_TECH: 2,
  PHARMACY_MANAGER: 3,
  PHARMACIST: 4,
  STAFF_PHARMACIST: 5,
  PHARMACY_INTERN: 6,
  PHARMACY_TECH_LEAD: 7,
  PHARMACY_TECH: 8,
  TECH_IN_TRAINING: 9,
  CASHIER: 10,
  DELIVERY_DRIVER: 10,
} as const;

/**
 * Map PharmacyRole to permission level
 */
const pharmacyRoleToLevel: Record<string, number> = {
  MASTER_USER: 0,
  SYSTEM_ADMIN: 1,
  COMPUTER_TECH: 2,
  PHARMACY_MANAGER: 3,
  PHARMACIST: 4,
  STAFF_PHARMACIST: 5,
  PHARMACY_INTERN: 6,
  PHARMACY_TECH_LEAD: 7,
  PHARMACY_TECH: 8,
  TECH_IN_TRAINING: 9,
  CASHIER: 10,
  DELIVERY_DRIVER: 10,
};

/**
 * Authentication middleware
 */
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

/**
 * Check if user has any of the allowed roles
 * Considers: isSuperuser, role enum, boolean flags
 */
function checkRoleAccess(user: AuthUser, allowedRoles: string[]): boolean {
  // Superusers bypass all role checks
  if (user.isSuperuser) {
    return true;
  }

  // Check UserRole enum
  if (allowedRoles.includes(user.role)) {
    return true;
  }

  // Check boolean flags for clinical roles
  if (user.isDoctor && (allowedRoles.includes('DOCTOR') || allowedRoles.includes('ADMIN'))) {
    return true;
  }

  if (user.isPharmacist && (allowedRoles.includes('PHARMACIST') || allowedRoles.includes('ADMIN'))) {
    return true;
  }

  if (user.isPharmacyTechnician && allowedRoles.includes('PHARMACY_TECH')) {
    return true;
  }

  return false;
}

/**
 * Role-based authorization middleware
 * Priority order:
 * 1. Superusers bypass all checks
 * 2. Check UserRole enum
 * 3. Check boolean flags (isDoctor, isPharmacist, isPharmacyTechnician)
 */
const hasRole = (allowedRoles: string[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in',
      });
    }

    const user = ctx.session.user as AuthUser;

    if (checkRoleAccess(user, allowedRoles)) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
        },
      });
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  });

/**
 * Permission level-based authorization middleware
 * Requires user to have permission level <= requiredLevel (lower is higher access)
 * Also checks: isSuperuser, isDoctor, isPharmacist flags
 */
const hasPermissionLevel = (requiredLevel: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in',
      });
    }

    const user = ctx.session.user as AuthUser;

    // Superusers have level 0 (highest access)
    if (user.isSuperuser) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: 0,
        },
      });
    }

    // Doctors have pharmacist-equivalent access (level 4)
    if (user.isDoctor && requiredLevel >= PermissionLevels.PHARMACIST) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: PermissionLevels.PHARMACIST,
        },
      });
    }

    // Check PharmacyStaff permission level from database
    if (ctx.db) {
      const pharmacyStaff = await ctx.db.pharmacyStaff.findUnique({
        where: { userId: user.id },
        select: { role: true, permissionLevel: true },
      });

      if (pharmacyStaff) {
        const effectiveLevel = pharmacyStaff.permissionLevel ?? pharmacyRoleToLevel[pharmacyStaff.role] ?? 10;

        if (effectiveLevel <= requiredLevel) {
          return next({
            ctx: {
              ...ctx,
              user: ctx.session.user,
              permissionLevel: effectiveLevel,
              pharmacyRole: pharmacyStaff.role,
            },
          });
        }
      }
    }

    // Fallback: check boolean flags for basic permission levels
    if (user.isPharmacist && requiredLevel >= PermissionLevels.PHARMACIST) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: PermissionLevels.PHARMACIST,
        },
      });
    }

    if (user.isPharmacyTechnician && requiredLevel >= PermissionLevels.PHARMACY_TECH) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: PermissionLevels.PHARMACY_TECH,
        },
      });
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This action requires permission level ${requiredLevel} or higher`,
    });
  });

/**
 * Combined role AND level check
 * User must have one of the allowed roles AND permission level <= requiredLevel
 */
const hasRoleAndLevel = (allowedRoles: string[], requiredLevel: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in',
      });
    }

    const user = ctx.session.user as AuthUser;

    // Superusers bypass all checks
    if (user.isSuperuser) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: 0,
        },
      });
    }

    // Must pass role check first
    if (!checkRoleAccess(user, allowedRoles)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have the required role for this action',
      });
    }

    // Then check permission level
    let effectiveLevel = 10; // Default to lowest

    if (user.isDoctor) {
      effectiveLevel = Math.min(effectiveLevel, PermissionLevels.PHARMACIST);
    }

    if (user.isPharmacist) {
      effectiveLevel = Math.min(effectiveLevel, PermissionLevels.PHARMACIST);
    }

    if (user.isPharmacyTechnician) {
      effectiveLevel = Math.min(effectiveLevel, PermissionLevels.PHARMACY_TECH);
    }

    // Check database for PharmacyStaff level
    if (ctx.db) {
      const pharmacyStaff = await ctx.db.pharmacyStaff.findUnique({
        where: { userId: user.id },
        select: { role: true, permissionLevel: true },
      });

      if (pharmacyStaff) {
        const dbLevel = pharmacyStaff.permissionLevel ?? pharmacyRoleToLevel[pharmacyStaff.role] ?? 10;
        effectiveLevel = Math.min(effectiveLevel, dbLevel);
      }
    }

    if (effectiveLevel <= requiredLevel) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.session.user,
          permissionLevel: effectiveLevel,
        },
      });
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This action requires permission level ${requiredLevel} or higher`,
    });
  });

// Base procedures
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// Role-based procedures
export const adminProcedure = publicProcedure.use(hasRole(['ADMIN']));

export const clinicalProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'])
);

export const doctorProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'DOCTOR'])
);

export const pharmacistProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'PHARMACIST'])
);

export const nurseProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'DOCTOR', 'NURSE'])
);

// Permission level-based procedures (for pharmacy operations)
export const masterUserProcedure = publicProcedure.use(
  hasPermissionLevel(PermissionLevels.MASTER_USER)
);

export const managerProcedure = publicProcedure.use(
  hasPermissionLevel(PermissionLevels.PHARMACY_MANAGER)
);

export const pharmacistLevelProcedure = publicProcedure.use(
  hasPermissionLevel(PermissionLevels.PHARMACIST)
);

export const techLevelProcedure = publicProcedure.use(
  hasPermissionLevel(PermissionLevels.PHARMACY_TECH)
);

// Export utilities for custom procedures
export { hasRole, hasPermissionLevel, hasRoleAndLevel, checkRoleAccess };