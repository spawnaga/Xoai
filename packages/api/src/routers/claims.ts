import { z } from 'zod';
import { router, techLevelProcedure } from '../trpc';

export const claimsRouter = router({
  list: techLevelProcedure
    .input(z.object({ status: z.enum(['PENDING', 'PAID', 'REJECTED', 'REVERSED']).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.claim.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          fill: {
            include: {
              prescription: {
                include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });
    }),

  submit: techLevelProcedure
    .input(z.object({ fillId: z.string(), bin: z.string(), pcn: z.string(), group: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const claim = await ctx.db.claim.create({
        data: {
          fillId: input.fillId,
          bin: input.bin,
          pcn: input.pcn,
          group: input.group,
          status: 'PENDING',
          submittedAt: new Date(),
          submittedBy: ctx.user.id,
        },
      });

      return claim;
    }),

  reverse: techLevelProcedure
    .input(z.object({ claimId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.claim.update({
        where: { id: input.claimId },
        data: { status: 'REVERSED', reversedAt: new Date() },
      });
    }),
});
