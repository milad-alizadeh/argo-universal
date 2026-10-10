import type { Database } from '@repo/db';
import type { RegistryActorRef } from './registry-machine';
import type { createSessionReader } from './session-record';

// What the Session procedures read, run and admit commands through.
export interface SessionRouterDeps {
  database: Database;
  sessions: RegistryActorRef;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  sessionCommandSignal?: AbortSignal;
}
