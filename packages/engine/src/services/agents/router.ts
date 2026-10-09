import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';
import { browseAgentCatalog } from './catalog/browse';

export const agentsRouter = router({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ ctx, input }): Promise<AgentsCatalogOutput> =>
      browseAgentCatalog(ctx.sessions.system, input),
    ),
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(
      ({ ctx: engineContext, input: request }): Promise<AgentsListOutput> =>
        listAgents(engineContext.sessions, request),
    ),
});
