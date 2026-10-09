import { AgentsListInput, AgentsListOutput } from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';

export const agentsRouter = router({
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(
      ({ ctx: engineContext, input: request }): Promise<AgentsListOutput> =>
        listAgents(engineContext.sessions, request),
    ),
});
