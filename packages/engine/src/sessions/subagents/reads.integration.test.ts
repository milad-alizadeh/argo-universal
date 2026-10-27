import type { Subagent } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { countDatabaseReads, insertSession } from '#mocks/database';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { TurnInsertJob } from '../session-storage';
import { createSubagentsReader } from './reader';

type SnapshotHost = ReturnType<typeof startSnapshotHost>;

const storeTurns = (
  host: SnapshotHost,
  turns: (typeof turn.$inferInsert)[],
): void => {
  host.database.insert(turn).values(turns).run();
};

const insertChild = (host: SnapshotHost, id: string): void => {
  insertSession(host.database, { id, parentSessionId: 'session-1' });
};

const latestTurns = (subagents: Subagent[]): unknown[] =>
  subagents.map(({ sessionId, state, startedAt, stopReason }) => ({
    sessionId,
    state,
    startedAt,
    stopReason,
  }));

it('reads every Subagent latest Turn with the same database reads however many children the Session has', (): void => {
  const host = startSnapshotHost();
  insertChild(host, 'child-1');
  storeTurns(host, [
    { id: 'turn-1a', sessionId: 'child-1', status: 'ended', startedAt: 1 },
    { id: 'turn-1b', sessionId: 'child-1', status: 'running', startedAt: 20 },
  ]);
  const counted = countDatabaseReads(host.database);
  const read = createSubagentsReader(host.sources);

  read('session-1');
  const oneChild = counted.metrics.queries;

  for (const id of ['child-2', 'child-3', 'child-4']) insertChild(host, id);
  storeTurns(host, [
    {
      id: 'turn-2',
      sessionId: 'child-2',
      status: 'ended',
      startedAt: 5,
      endedAt: 8,
      stopReason: 'end_turn',
    },
    { id: 'turn-3', sessionId: 'child-3', status: 'running', startedAt: 9 },
  ]);
  host.write(
    new TurnInsertJob({
      turn: {
        id: 'turn-3b',
        sessionId: 'child-3',
        status: 'running',
        startedAt: 30,
      },
    }),
  );
  host.write(
    new TurnInsertJob({
      turn: {
        id: 'turn-4',
        sessionId: 'child-4',
        status: 'running',
        startedAt: 40,
      },
    }),
  );
  const subagents = read('session-1');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(2);
  expect(counted.metrics.queries - oneChild).toBe(oneChild);
  expect(latestTurns(subagents)).toEqual([
    { sessionId: 'child-1', state: 'running', startedAt: 20, stopReason: null },
    {
      sessionId: 'child-2',
      state: 'idle',
      startedAt: 5,
      stopReason: 'end_turn',
    },
    { sessionId: 'child-3', state: 'running', startedAt: 30, stopReason: null },
    { sessionId: 'child-4', state: 'running', startedAt: 40, stopReason: null },
  ]);
});
