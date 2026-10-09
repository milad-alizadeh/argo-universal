import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';
import {
  readAgentCatalogFromSupervisor,
  syncAgentCatalog,
} from './catalog/catalog';
import { watchCommittedCatalogChanges } from './catalog/catalog-changes';

export const agentsRouter = router({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ ctx, input }): AgentsCatalogOutput =>
      readAgentCatalogFromSupervisor(ctx.catalogSync, input),
    ),
  syncCatalog: publicProcedure.mutation(({ ctx }) =>
    syncAgentCatalog(ctx.catalogSync),
  ),
  catalogChanges: publicProcedure.subscription(({ ctx, signal }) => {
    if (!signal) throw new Error('Catalog subscription signal is missing');
    return watchCommittedCatalogChanges(ctx.catalogSync, signal);
  }),
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(
      ({ ctx: engineContext, input: request }): Promise<AgentsListOutput> =>
        listAgents(engineContext.sessions, request),
    ),
});
