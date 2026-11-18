import { mergeRouters, routerFactory } from '../rpc';
import type { OpenSessionsActorRef, SessionConnections } from '../sessions';
import { createAuthRouter } from './auth/router';
import type { RegistryDeps } from './registry/registry-operations';
import type { InstalledAgents } from './servers/installed-agents';
import { createUsageLimitsRouter } from './usage-limits/router';

export type AgentsRouterDeps = RegistryDeps & {
  sessions: OpenSessionsActorRef;
  sessionConnections: SessionConnections;
  installedAgents: InstalledAgents;
  sessionCommandSignal?: AbortSignal;
};

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(createAuthRouter(deps), createUsageLimitsRouter(deps)),
);
