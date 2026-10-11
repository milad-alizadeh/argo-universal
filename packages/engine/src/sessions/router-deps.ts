import type { Database } from '@repo/db';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { createSessionReader } from './session-record';

// What the Session procedures read, run and admit commands through.
export interface SessionRouterDeps {
  database: Database;
  sessions: OpenSessionsActorRef;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  sessionCommandSignal?: AbortSignal;
}
