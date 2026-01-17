import { z } from 'zod';
import { router, techLevelProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const fillRouter = router({
  list: techLevelProcedure
    .input(z.object({ status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.fill.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          prescription: {
            include: {
              patient: { select: { firstName: true, lastName: true, mrn: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  finalize: techLevelProcedure
    .input(
      z.object({
        fillId: z.string(),
        ndc: z.string(),
        lotNumber: z.string(),
        expirationDate: z.date(),
        quantityDispensed: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fill = await ctx.db.fill.update({
        where: { id: input.fillId },
        data: {
          ndc: input.ndc,
          lotNumber: input.lotNumber,
          expirationDate: input.expirationDate,
          quantityDispensed: input.quantityDispensed,
          status: 'COMPLETED',
          filledAt: new Date(),
          filledBy: ctx.user.id,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'Fill',
          resourceId: fill.id,
          userId: ctx.user.id,
          details: { status: 'COMPLETED' },
        },
      });

      return fill;
    }),
});
