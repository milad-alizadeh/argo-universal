import type { SessionInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { WriterActorRef } from '../../storage';
import type { OpenSessionsActorRef } from '../open-sessions-machine';
import type { createLiveHeaderRowsReader } from './live-header-rows';

export interface ListReadInput {
  database: Database;
  writer: WriterActorRef | undefined;
  readLiveHeaderRows: ReturnType<typeof createLiveHeaderRowsReader>;
  validate: <Value>(read: () => Value) => Value | undefined;
  rejectedSessions: Set<string>;
  shellCounts: Map<string, SessionInfo['shells']>;
}

export interface ListReaderOptions {
  database: Database;
  sessions: OpenSessionsActorRef;
  writer: () => WriterActorRef | undefined;
}
