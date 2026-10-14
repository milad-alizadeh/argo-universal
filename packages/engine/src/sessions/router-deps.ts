import type { Database } from '@repo/db';
import type { DiscoveryCacheActor } from './discovery-cache-machine';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { createSessionReader } from './session-record';

// What the Session procedures read, run and admit commands through.
export interface SessionRouterDeps {
  database: Database;
  discovery: DiscoveryCacheActor;
  sessions: OpenSessionsActorRef;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  sessionCommandSignal?: AbortSignal;
  // Saves why an Agent failed to open a Session, so it leaves the New Session picker.
  afterAgentOpenFailure?: (agentId: string, reason: string) => Promise<void>;
}
