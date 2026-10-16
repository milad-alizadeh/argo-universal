import { mergeRouters, routerFactory } from '../rpc';
import type { OpenSessionsActorRef, SessionConnections } from '../sessions';
import { createAuthRouter } from './auth/router';
import {
  createRegistryRouter,
  type RegistryDeps,
} from './registry/registry-router';
import type { InstalledAgents } from './servers/installed-agents';

export type AgentsRouterDeps = RegistryDeps & {
  sessions: OpenSessionsActorRef;
  sessionConnections: SessionConnections;
  installedAgents: InstalledAgents;
  sessionCommandSignal?: AbortSignal;
};

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(createRegistryRouter(deps), createAuthRouter(deps)),
);
