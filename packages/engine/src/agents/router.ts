import { mergeRouters, routerFactory } from '../rpc';
import type { SessionConnections, OpenSessionsActorRef } from '../sessions';
import { createAuthRouter } from './auth/router';
import {
  createRegistryRouter,
  type RegistryDeps,
} from './registry/registry-router';

export type AgentsRouterDeps = RegistryDeps & {
  sessionConnections: SessionConnections;
  sessions: OpenSessionsActorRef;
  home: string;
  sessionCommandSignal?: AbortSignal;
};

export const createAgentsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(createRegistryRouter(deps), createAuthRouter(deps)),
);
