import type { SessionInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { WriterActorRef } from '../../../storage';
import type { createLiveHeaderReader } from '../../live-header';
import type { OpenSessionsActorRef } from '../../open-sessions-machine';

export interface ListReadInput {
  database: Database;
  writer: WriterActorRef | undefined;
  readLiveHeader: ReturnType<typeof createLiveHeaderReader>;
  validate: <Value>(read: () => Value) => Value | undefined;
  rejectedSessions: Set<string>;
  shellCounts: Map<string, SessionInfo['shells']>;
}

export interface ListReaderOptions {
  database: Database;
  sessions: OpenSessionsActorRef;
  writer: () => WriterActorRef | undefined;
}
