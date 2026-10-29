import { SessionRecord, Turn } from '@repo/contracts';
import { expect, it } from 'vitest';
import { runningTurn, selectSession, submitWrites } from '#mocks/queued-writes';
import type { WriterJob } from '../../storage';
import {
  type QueuedSessionChange,
  type QueuedSessionInsert,
  type QueuedTurnChange,
  type QueuedTurnInsert,
  readQueuedSessionRows,
} from '.';

// A job of a module Session storage does not know: it shows in reads only through the roles it takes.
const foreignJob = (
  roles:
    | QueuedSessionChange
    | QueuedSessionInsert
    | (QueuedTurnChange & QueuedTurnInsert),
): WriterJob => ({
  describe: (): string => 'a job of another module',
  commit: (): void => undefined,
  ...roles,
});

const queuedTurn = Turn.parse({
  ...runningTurn,
  startedAt: 500,
  endedAt: null,
  error: null,
  usage: null,
  stopReason: null,
  model: null,
});

it('reads a Session row through the Session change of any queued job', (): void => {
  const before = SessionRecord.parse(selectSession());

  const { writer } = submitWrites([
    foreignJob({
      projectSession: (current, sessionId): SessionRecord | undefined =>
        current && sessionId === 'session-1'
          ? { ...current, title: 'Pinned' }
          : current,
    }),
  ]);

  expect(readQueuedSessionRows(writer).session(before, 'session-1')).toEqual({
    ...before,
    title: 'Pinned',
  });
});

it('lists the Sessions any queued job inserts, once each and within scope', (): void => {
  const { writer } = submitWrites([
    foreignJob({ insertedSessionIds: () => ['session-7'] }),
    foreignJob({
      insertedSessionIds: (scope): string[] =>
        scope?.includes('session-7') ? [] : ['session-7', 'session-8'],
    }),
  ]);

  const queued = readQueuedSessionRows(writer);
  expect(queued.sessionIds()).toEqual(['session-7', 'session-8']);
  expect(queued.sessionIds(['session-7'])).toEqual(['session-7']);
});

it('reads Turns and their Session through the Turn roles of any queued job', (): void => {
  const { writer } = submitWrites([
    foreignJob({
      projectTurn: (): Turn => queuedTurn,
      insertedTurnSessionId: (turnId): string | undefined =>
        turnId === queuedTurn.id ? queuedTurn.sessionId : undefined,
    }),
  ]);

  const queued = readQueuedSessionRows(writer);
  expect(queued.turns([])).toEqual([queuedTurn]);
  expect(queued.turnSessionId('turn-1')).toBe('session-1');
  expect(queued.turnSessionId('turn-2')).toBeUndefined();
});
