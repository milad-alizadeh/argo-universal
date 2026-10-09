import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';

export const agentsRouter = router({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ ctx, input }): AgentsCatalogOutput =>
      ctx.agentCatalog.readCatalog(input),
    ),
  syncCatalog: publicProcedure.mutation(({ ctx }) =>
    ctx.agentCatalog.syncCatalog(),
  ),
  catalogChanges: publicProcedure.subscription(({ ctx, signal }) => {
    if (!signal) throw new Error('Catalog subscription signal is missing');
    return ctx.agentCatalog.watchCatalogChanges(signal);
  }),
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(
      ({ ctx: engineContext, input: request }): Promise<AgentsListOutput> =>
        listAgents(engineContext.sessions, request),
    ),
});
