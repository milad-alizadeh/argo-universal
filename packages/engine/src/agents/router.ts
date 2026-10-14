import {
  AgentCheck,
  AgentId,
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
import type { AgentInstallations } from './install/lifecycle/operations';
import { createInstallRouter } from './install/router';
import type { AgentLogins } from './login';
import { createLoginRouter } from './login-router';
import type { AgentReadiness } from './readiness/agent-readiness';
import { type AgentResolver, checkNewlyFound } from './resolver/agent-resolver';
import {
  requestAgentCatalogSync,
  type syncSupervisorMachine,
} from './sync-supervisor-machine';
import { createToolsRouter } from './tools-router';

type CatalogDeps = Pick<ConfigurationDeps, 'database' | 'databaseWriter'> & {
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  resolver: AgentResolver;
  readiness: AgentReadiness;
  sessionCommandSignal?: AbortSignal;
};

export type AgentsRouterDeps = ConfigurationDeps &
  CatalogDeps & {
    sessions: OpenSessionsActorRef;
    installations: AgentInstallations;
    agentLogins: AgentLogins;
    readiness: AgentReadiness;
    resolver: AgentResolver;
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
      // An Agents page visit also looks for Agents installed since the last stale look.
      checkNewlyFound(
        deps.resolver.resolveIfStale(),
        deps.readiness.recheckLater,
      );
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
  refresh: boolean,
): Promise<AgentsListOutput> => {
  if (refresh) await deps.readiness.recheckEvery();
  return listAgents(deps.database, deps.home ?? '');
};
const createListRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    list: publicProcedure
      .input(AgentsListInput)
      .output(AgentsListOutput)
      .query(({ input }) => configuredAgentList(deps, !!input?.refresh)),
    recheck: publicProcedure
      .input(AgentId)
      .output(AgentCheck)
      .mutation(({ input }) => {
        deps.sessionCommandSignal?.throwIfAborted();
        return deps.readiness.recheck(input.agentId);
      }),
  }),
);

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(
    createConfigurationRouter(ownedConfiguration(deps)),
    createInstallRouter(deps.installations),
    createToolsRouter(deps),
    createCatalogRouter(deps),
    createCatalogSyncRouter(deps),
    createListRouter(deps),
    createLoginRouter(deps),
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
  afterEnable: (agentId) => deps.readiness.recheckLater(agentId),
});
