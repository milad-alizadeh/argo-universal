import { AgentsListInput, AgentsListOutput } from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';

export const agentsRouter = router({
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(({ ctx, input }): Promise<AgentsListOutput> =>
      ctx.services.agents.list(input),
    ),
});
