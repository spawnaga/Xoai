import { z } from 'zod';
import { router, techLevelProcedure } from '../trpc';

export const dispenseRouter = router({
  list: techLevelProcedure.query(async ({ ctx }) => {
    return ctx.db.fill.findMany({
      where: { verifiedAt: { not: null }, dispensedAt: null },
      include: {
        prescription: {
          include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
        },
      },
      orderBy: { verifiedAt: 'asc' },
    });
  }),

  dispense: techLevelProcedure
    .input(
      z.object({
        fillId: z.string(),
        patientSignature: z.string().optional(),
        identityConfirmed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fill = await ctx.db.fill.update({
        where: { id: input.fillId },
        data: {
          dispensedAt: new Date(),
          dispensedBy: ctx.user.id,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          action: 'DISPENSE',
          resourceType: 'Fill',
          resourceId: fill.id,
          userId: ctx.user.id,
          details: { identityConfirmed: input.identityConfirmed },
        },
      });

      return fill;
    }),
});
