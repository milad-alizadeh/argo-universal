import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import type { ActorRefFrom } from 'xstate';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import type { OpenSessionsActorRef } from '../sessions';
import { listAgents } from './agent-list';
import { watchCommittedCatalogChanges } from './catalog-changes';
import { readAgentCatalog } from './catalog-sql';
import type { ConfigurationDeps } from './configuration/configuration-commands';
import { createConfigurationRouter } from './configuration/configuration-router';
import { listCustomAgents } from './configuration/custom-agent-list';
import { listInstalledAgents } from './install/list';
import type { AgentInstallations } from './install/operations';
import { createInstallRouter } from './install/router';
import { readInstallSelection } from './install/selection';
import {
  requestAgentCatalogSync,
  type syncSupervisorMachine,
} from './sync-supervisor-machine';

type CatalogDeps = Pick<ConfigurationDeps, 'database' | 'databaseWriter'> & {
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  sessionCommandSignal?: AbortSignal;
};

export type AgentsRouterDeps = ConfigurationDeps &
  CatalogDeps & {
    sessions: OpenSessionsActorRef;
    installations: AgentInstallations;
    home?: string;
  };

const createCatalogRouter = routerFactory((deps: CatalogDeps) =>
  router({
    catalog: publicProcedure
      .input(AgentsCatalogInput)
      .query(({ input }): AgentsCatalogOutput =>
        readAgentCatalog(deps.database, input),
      ),
  }),
);

const createCatalogSyncRouter = routerFactory((deps: CatalogDeps) =>
  router({
    syncCatalog: publicProcedure.mutation(() => {
      deps.sessionCommandSignal?.throwIfAborted();
      return requestAgentCatalogSync(deps.syncSupervisor);
    }),
    catalogChanges: publicProcedure.subscription(({ signal }) => {
      if (!signal) throw new Error('Catalog subscription signal is missing');
      return watchCommittedCatalogChanges(deps, signal);
    }),
  }),
);

const createListRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    list: publicProcedure
      .input(AgentsListInput)
      .output(AgentsListOutput)
      .query(async ({ input }): Promise<AgentsListOutput> => [
        ...(await listAgents(deps.sessions, input)).filter(
          (agent) => !readInstallSelection(deps.database, agent.agent),
        ),
        ...(deps.home
          ? await listInstalledAgents(deps.database, deps.home)
          : []),
        ...(await listCustomAgents(deps)),
      ]),
  }),
);

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(
    createConfigurationRouter({
      ...deps,
      withAgentSetup: (agentId, operation) =>
        deps.installations.configure(agentId, operation),
    }),
    createInstallRouter(deps.installations),
    createCatalogRouter(deps),
    createCatalogSyncRouter(deps),
    createListRouter(deps),
  ),
);
