import type { Database } from '@repo/db';
import { createActor, type InputFrom } from 'xstate';
import {
  feedMachine,
  readQueuedFeedRow,
  readWrittenRow,
  type FeedActorRef,
} from '../src/feed';
import { findMachineActor } from '../src/lib/machine-actor';
import { databaseWriterId, writerMachine } from '../src/storage';
import { waitForAcpSessionIdle } from './acp-feed';
import type { startEngineTestHost } from './engine';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

export const openFeedForModule = async (
  host: Host,
  agent: string,
  createId: () => string,
): Promise<FeedActorRef> => {
  openSession(host, agent);
  await waitForAcpSessionIdle(host, 'session-1');
  const count = feedRowCount(host.database);

  return createActor(feedMachine, {
    parent: host.engine,
    input: feedInput(host, count, createId),
  }).start();
};

const openSession = (host: Host, agent: string): void => {
  host.openSessions.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent,
  });
};

const feedRowCount = (database: Database): number => {
  const count = database.$client
    .prepare('SELECT count(*) AS count FROM feed_row WHERE session_id = ?')
    .get('session-1');

  if (typeof count?.count !== 'number')
    throw new Error('Stored Feed row count is missing');

  return count.count;
};

const feedInput = (
  host: Host,
  count: number,
  createId: () => string,
): InputFrom<typeof feedMachine> => ({
  sessionId: 'session-1',
  epoch: 3,
  maxRevision: count,
  nextPosition: count,
  now: Date.now,
  createId,
  findWrittenRow: (id) => storedRow(host, id),
});

const storedRow = (host: Host, id: string): ReturnType<typeof readWrittenRow> =>
  readWrittenRow({
    database: host.database,
    pending: readQueuedFeedRow(
      findMachineActor(host.engine.system, databaseWriterId, writerMachine),
      { sessionId: 'session-1', id },
    ),
    sessionId: 'session-1',
    id,
  });
