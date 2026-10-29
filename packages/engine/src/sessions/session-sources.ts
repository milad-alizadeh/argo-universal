import type { CoreHooks } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import type { InstalledAgents } from '../agents';
import type { FeedDeps } from '../feed';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { createSessionReader } from './session-record';

// What the Engine runs Sessions with; its composition hands them to `Sessions` once.
export interface SessionSources extends Pick<
  FeedDeps,
  'findFeed' | 'findWriter'
> {
  database: Database;
  sessions: OpenSessionsActorRef;
  installedAgents: InstalledAgents;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  // Aborts when the Engine stops admitting Session commands.
  sessionCommandSignal?: AbortSignal;
  // Plugin Hooks on starting a Session and submitting a prompt (ADR-0027).
  hooks: CoreHooks;
}
