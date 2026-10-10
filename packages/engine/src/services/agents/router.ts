import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';
import { watchCommittedCatalogChanges } from './catalog/catalog-changes';
import { readAgentCatalog } from './catalog/catalog-sql';
import { requestAgentCatalogSync } from './catalog/sync-supervisor-machine';

export const agentsRouter = router({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ ctx, input }): AgentsCatalogOutput =>
      readAgentCatalog(ctx.database, input),
    ),
  syncCatalog: publicProcedure.mutation(({ ctx }) => {
    ctx.sessionCommandSignal?.throwIfAborted();
    return requestAgentCatalogSync(ctx.syncSupervisor);
  }),
  catalogChanges: publicProcedure.subscription(({ ctx, signal }) => {
    if (!signal) throw new Error('Catalog subscription signal is missing');
    return watchCommittedCatalogChanges(
      {
        database: ctx.database,
        writer: ctx.databaseWriter,
      },
      signal,
    );
  }),
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(
      ({ ctx: engineContext, input: request }): Promise<AgentsListOutput> =>
        listAgents(engineContext.sessions, request),
    ),
});
