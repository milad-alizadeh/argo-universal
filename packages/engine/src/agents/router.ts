import {
  AgentsCatalogInput,
  type AgentsCatalogOutput,
  AgentsListInput,
  AgentsListOutput,
} from '@repo/contracts';
import type { ActorRefFrom } from 'xstate';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import type { OpenSessionsActorRef, SessionConnections } from '../sessions';
import { createAuthRouter } from './auth/router';
import { watchCommittedCatalogChanges } from './catalog-changes';
import { readAgentCatalog } from './catalog-sql';
import type { ConfigurationDeps } from './configuration/configuration-commands';
import { createConfigurationRouter } from './configuration/configuration-router';
import { listCustomAgents } from './configuration/custom-agent-list';
import type { AgentInstallations } from './install/lifecycle/operations';
import { createInstallRouter } from './install/router';
import { listInstalledAgents } from './install/selection/list';
import {
  createRegistryRouter,
  type RegistryDeps,
} from './registry/registry-router';
import type { InstalledAgents } from './servers/installed-agents';
import {
  requestAgentCatalogSync,
  type syncSupervisorMachine,
} from './sync-supervisor-machine';

type CatalogDeps = Pick<ConfigurationDeps, 'database' | 'databaseWriter'> & {
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  sessionCommandSignal?: AbortSignal;
};

export type AgentsRouterDeps = RegistryDeps &
  ConfigurationDeps &
  CatalogDeps & {
    sessions: OpenSessionsActorRef;
    sessionConnections: SessionConnections;
    installations: AgentInstallations;
    installedAgents: InstalledAgents;
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

const configuredAgentList = async (
  deps: AgentsRouterDeps,
): Promise<AgentsListOutput> => {
  const configured = ownedConfiguration(deps);

  const installed = deps.home
    ? await listInstalledAgents(deps.database, deps.home, configured)
    : [];

  return [...installed, ...(await listCustomAgents(configured))];
};

const createListRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    list: publicProcedure
      .input(AgentsListInput)
      .output(AgentsListOutput)
      .query(({ input }) => {
        if (input?.refresh) deps.invalidateIdleAgents?.();

        return configuredAgentList(deps);
      }),
  }),
);

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(
    createConfigurationRouter(ownedConfiguration(deps)),
    createInstallRouter({ installations: deps.installations, registry: deps }),
    createCatalogRouter(deps),
    createCatalogSyncRouter(deps),
    createListRouter(deps),
    createRegistryRouter(deps),
    createAuthRouter(deps),
  ),
);

const ownedConfiguration = (deps: AgentsRouterDeps): ConfigurationDeps => ({
  ...deps,
  withAgentSetup: (agentId, operation) =>
    deps.installations.configure(agentId, operation),
  withAgentMutation: (agentId, operation) =>
    deps.installations.mutateLaunch(agentId, operation),
  withAgentCheck: (agentId, operation) =>
    deps.installations.check(agentId, operation),
});
