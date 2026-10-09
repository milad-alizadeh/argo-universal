import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { listAgents } from './agent-list';
import { readAgentCatalog } from './catalog/browse';
import { watchCommittedCatalogChanges } from './catalog/catalog-changes';
import { requestAgentCatalogSync } from './catalog/catalog-request';

export const agentsRouter = router({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ ctx, input }): AgentsCatalogOutput =>
      readAgentCatalog({ database: ctx.database, ...ctx.catalogRead }, input),
    ),
  syncCatalog: publicProcedure.mutation(({ ctx, signal }) =>
    requestAgentCatalogSync({
      database: ctx.database,
      writer: ctx.databaseWriter,
      reader: ctx.catalogRead.reader,
      requestId: ctx.createId(),
      admissionSignal: ctx.sessionCommandSignal,
      signal,
    }),
  ),
  catalogChanges: publicProcedure.subscription(({ ctx, signal }) => {
    if (!signal) throw new Error('Catalog subscription signal is missing');
    return watchCommittedCatalogChanges(
      { database: ctx.database, writer: ctx.databaseWriter },
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
