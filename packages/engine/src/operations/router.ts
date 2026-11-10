import {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations';
import {
  OperationRunRequest,
  OperationWaitRequest,
  PluginInstruction,
} from '@repo/contracts/operations/control';
import { z } from 'zod';
import { publicProcedure, routerFactory, router, mergeRouters } from '../rpc';
import type { OperationInstructions } from './instructions';
import type { Operations } from './operations';

const DiscoveryInput = z
  .strictObject({ filter: z.string().optional() })
  .optional();

const discoveryRouter = routerFactory((engine: Operations) =>
  router({
    list: publicProcedure
      .input(DiscoveryInput)
      .query(({ ctx, input }) => engine.list(ctx.token, input?.filter)),
  }),
);

const instructionsRouter = routerFactory(
  (instructions: OperationInstructions) =>
    router({
      instructions: publicProcedure
        .output(z.array(PluginInstruction))
        .query(({ ctx }) => instructions.read(ctx.token)),
    }),
);

const executionRouter = routerFactory((engine: Operations) =>
  router({
    run: publicProcedure
      .input(OperationRunRequest)
      .output(OperationRunResponse)
      .mutation(({ ctx, input, signal }) =>
        engine.run(ctx.token, input, signal),
      ),
  }),
);

const waitingRouter = routerFactory((engine: Operations) =>
  router({
    wait: publicProcedure
      .input(OperationWaitRequest)
      .output(OperationExecution)
      .mutation(({ ctx, input, signal }) =>
        engine.wait(input, ctx.token, signal),
      ),
  }),
);

type OperationsRouterInput = {
  operations: Operations;
  instructions: OperationInstructions;
};

export const createOperationsRouter = routerFactory(
  ({ operations, instructions }: OperationsRouterInput) =>
    mergeRouters(
      discoveryRouter(operations),
      instructionsRouter(instructions),
      executionRouter(operations),
      waitingRouter(operations),
    ),
);
