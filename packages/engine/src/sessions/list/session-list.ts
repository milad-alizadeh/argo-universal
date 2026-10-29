import type {
  SessionCounts,
  SessionInfo,
  SessionListInput,
  SessionListOutput,
  SessionListUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import type { WriterActorRef } from '../../storage';
import type { OpenSessionsActorRef } from '../open-sessions-machine';
import {
  selectSessionChanges,
  selectSessionCounts,
  SessionListObserver,
} from './observation';
import { createSessionListReader } from './reader';
import { sessionListPage } from './session-list-page';

export interface SessionList {
  list: (input: SessionListInput) => Promise<SessionListOutput>;
  listUpdates: (
    signal: AbortSignal | undefined,
  ) => AsyncIterable<SessionListUpdate>;
  counts: (signal: AbortSignal | undefined) => AsyncIterable<SessionCounts>;
}

type ListOptions = { database: Database; sessions: OpenSessionsActorRef };

export function createSessionList(options: ListOptions): SessionList {
  return listProcedures(createObserver(options));
}

function createObserver(options: ListOptions): SessionListObserver {
  const writer = (): WriterActorRef =>
    options.sessions.getSnapshot().context.writer;

  return new SessionListObserver({
    ...createSessionListReader({ ...options, writer }),
    sessions: options.sessions,
    writer,
  });
}

function listProcedures(observer: SessionListObserver): SessionList {
  return {
    list: async (input): Promise<SessionListOutput> =>
      sessionListPage(input, (): SessionInfo[] => informationRows(observer)),
    listUpdates: (signal): AsyncIterable<SessionListUpdate> =>
      observer.watch(signal, selectSessionChanges()),
    counts: (signal): AsyncIterable<SessionCounts> =>
      observer.watch(signal, selectSessionCounts()),
  };
}

function informationRows(
  observer: SessionListObserver,
): SessionListOutput['sessions'] {
  return observer
    .readCachedRows()
    .map((row): typeof row.information => row.information);
}
