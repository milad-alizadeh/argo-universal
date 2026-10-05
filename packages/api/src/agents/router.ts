import { AgentsListOutput } from '@repo/contracts';
import { publicProcedure, router } from '../trpc';

export const agentsRouter = router({
  list: publicProcedure
    .output(AgentsListOutput)
    .query(({ ctx }) => ctx.services.agents.list()),
});
