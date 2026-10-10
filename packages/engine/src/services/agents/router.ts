import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import type { ActorRefFrom } from 'xstate';
import { mergeRouters, publicProcedure, routerFactory } from '../../rpc';
import type { RegistryActorRef } from '../sessions';
import { listAgents } from './agent-list';
import { watchCommittedCatalogChanges } from './catalog/catalog-changes';
import { readAgentCatalog } from './catalog/catalog-sql';
import {
  requestAgentCatalogSync,
  type syncSupervisorMachine,
} from './catalog/sync-supervisor-machine';
import type { ConfigurationDeps } from './configuration/configuration-commands';
import {
  type ConfigurationRouter,
  createConfigurationRouter,
} from './configuration/configuration-router';
import { listCustomAgents } from './configuration/custom-agent-list';

type CatalogDeps = Pick<ConfigurationDeps, 'database' | 'databaseWriter'> & {
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  sessionCommandSignal?: AbortSignal;
};

export type AgentsRouterDeps = ConfigurationDeps &
  CatalogDeps & { sessions: RegistryActorRef };

const createCatalogRouter = routerFactory((deps: CatalogDeps) => ({
  catalog: publicProcedure
    .input(AgentsCatalogInput)
    .query(({ input }): AgentsCatalogOutput =>
      readAgentCatalog(deps.database, input),
    ),
  syncCatalog: publicProcedure.mutation(() => {
    deps.sessionCommandSignal?.throwIfAborted();
    return requestAgentCatalogSync(deps.syncSupervisor);
  }),
  catalogChanges: publicProcedure.subscription(({ signal }) => {
    if (!signal) throw new Error('Catalog subscription signal is missing');
    return watchCommittedCatalogChanges(deps, signal);
  }),
}));

const createListRouter = routerFactory((deps: AgentsRouterDeps) => ({
  list: publicProcedure
    .input(AgentsListInput)
    .output(AgentsListOutput)
    .query(async ({ input }): Promise<AgentsListOutput> => [
      ...(await listAgents(deps.sessions, input)),
      ...(await listCustomAgents(deps.database)),
    ]),
}));

type AgentsRouter = ReturnType<
  typeof mergeRouters<
    [
      ConfigurationRouter,
      ReturnType<typeof createCatalogRouter>,
      ReturnType<typeof createListRouter>,
    ]
  >
>;

export const createAgentsRouter = (deps: AgentsRouterDeps): AgentsRouter =>
  mergeRouters(
    createConfigurationRouter(deps),
    createCatalogRouter(deps),
    createListRouter(deps),
  );
