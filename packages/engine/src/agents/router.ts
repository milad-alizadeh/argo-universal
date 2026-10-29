import type { OpenSessionsActorRef, SessionConnections } from '../sessions';
import type { RegistryDeps } from './registry/registry-operations';
import type { InstalledAgents } from './servers/installed-agents';

export type AgentsRouterDeps = RegistryDeps & {
  sessions: OpenSessionsActorRef;
  sessionConnections: SessionConnections;
  installedAgents: InstalledAgents;
  sessionCommandSignal?: AbortSignal;
};

export { createAuthRouter as createAgentsRouter } from './auth/router';
