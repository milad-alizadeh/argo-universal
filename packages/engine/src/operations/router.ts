import {
  OperationExecution,
  OperationRunResponse,
  OperationWaitId,
} from '@repo/contracts/operations';
import { z } from 'zod';
import { publicProcedure, routerFactory, router, mergeRouters } from '../rpc';
import type { Operations } from './operations';

const DiscoveryInput = z
  .strictObject({ filter: z.string().optional() })
  .optional();

// Any id reaches the registry lookup, so a newer or Plugin Operation needs no newer caller.
const RunInput = z.strictObject({
  id: z.string(),
  params: z.json().default({}),
  wait: z.boolean().default(false),
});

const discoveryRouter = routerFactory((engine: Operations) =>
  router({
    list: publicProcedure
      .input(DiscoveryInput)
      .query(({ ctx, input }) => engine.list(ctx.token, input?.filter)),
  }),
);

const executionRouter = routerFactory((engine: Operations) =>
  router({
    run: publicProcedure
      .input(RunInput)
      .output(OperationRunResponse)
      .mutation(({ ctx, input, signal }) =>
        engine.run(ctx.token, input, signal),
      ),
  }),
);

const waitingRouter = routerFactory((engine: Operations) =>
  router({
    wait: publicProcedure
      .input(z.strictObject({ id: OperationWaitId }))
      .output(OperationExecution)
      .mutation(({ ctx, input, signal }) =>
        engine.wait(input.id, ctx.token, signal),
      ),
  }),
);

export const createOperationsRouter = routerFactory((engine: Operations) =>
  mergeRouters(
    discoveryRouter(engine),
    executionRouter(engine),
    waitingRouter(engine),
  ),
);
