import type { Database } from '@repo/db';
import type { InstalledAgents } from '../agents';
import type { FeedDeps } from '../feed';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { createSessionReader } from './session-record';

// What the Session procedures read, run and admit commands through.
export interface SessionRouterDeps extends Pick<
  FeedDeps,
  'findFeed' | 'findWriter'
> {
  database: Database;
  sessions: OpenSessionsActorRef;
  installedAgents: InstalledAgents;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  sessionCommandSignal?: AbortSignal;
}
