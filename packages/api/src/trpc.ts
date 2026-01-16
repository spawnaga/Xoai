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
 * Role-based authorization middleware
 */
const hasRole = (allowedRoles: string[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in',
      });
    }

    if (!allowedRoles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.session.user,
      },
    });
  });

export const protectedProcedure = publicProcedure.use(isAuthenticated);

export const adminProcedure = publicProcedure.use(hasRole(['ADMIN']));

export const clinicalProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'DOCTOR', 'NURSE'])
);

export const doctorProcedure = publicProcedure.use(
  hasRole(['ADMIN', 'DOCTOR'])
);
