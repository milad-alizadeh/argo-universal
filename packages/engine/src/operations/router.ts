import { OperationId } from '@repo/contracts/operations';
import { z } from 'zod';
import { publicProcedure, routerFactory, router } from '../rpc';
import type { Operations } from './operations';

const DiscoveryInput = z
  .strictObject({ filter: z.string().optional() })
  .optional();

const RunInput = z.strictObject({
  id: OperationId,
  params: z.json().default({}),
});

export const createOperationsRouter = routerFactory((engine: Operations) =>
  router({
    list: publicProcedure
      .input(DiscoveryInput)
      .query(({ ctx, input }) => engine.list(ctx.token, input?.filter)),
    run: publicProcedure
      .input(RunInput)
      .mutation(({ ctx, input }) =>
        engine.run(ctx.token, input.id, input.params),
      ),
  }),
);
