import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const verifyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.fill.findMany({
      where: { status: 'COMPLETED', verifiedAt: null },
      include: {
        prescription: {
          include: {
            patient: true,
            prescriber: true,
          },
        },
      },
      orderBy: { filledAt: 'asc' },
    });
  }),

  approve: protectedProcedure
    .input(z.object({ fillId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const fill = await ctx.db.fill.update({
        where: { id: input.fillId },
        data: {
          verifiedAt: new Date(),
          verifiedBy: ctx.user.id,
          verificationNotes: input.notes,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'VERIFY',
          resourceType: 'Fill',
          resourceId: fill.id,
          userId: ctx.user.id,
          details: { verified: true },
        },
      });

      return fill;
    }),
});
