import { Turn } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import {
  runningTurn,
  selectTurn,
  submitWrites,
  testDatabase,
} from '#mocks/queued-writes';
import { readQueuedSessionRows, TurnInsertJob, TurnUpdateJob } from '.';

it('reads a queued Turn update exactly as its commit', async (): Promise<void> => {
  testDatabase()
    .insert(turn)
    .values({ ...runningTurn, startedAt: 100 })
    .run();
  const before = Turn.parse(selectTurn());
  const original = structuredClone(before);

  const { writer, committed } = submitWrites([
    new TurnUpdateJob({
      id: 'turn-1',
      set: {
        status: 'ended',
        stopReason: 'error',
        endedAt: 200,
        error: { code: 'interrupted', message: 'Stopped' },
      },
    }),
  ]);

  const queued = readQueuedSessionRows(writer).turns([before]);
  await committed;
  expect(queued).toEqual([Turn.parse(selectTurn())]);
  expect(before).toEqual(original);
});

it('reads a queued Turn insert exactly as its commit', async (): Promise<void> => {
  const { writer, committed } = submitWrites([
    new TurnInsertJob({ turn: { ...runningTurn, startedAt: 12000 } }),
  ]);

  const queued = readQueuedSessionRows(writer);
  expect(queued.turnSessionId('turn-1')).toBe('session-1');
  const turns = queued.turns([]);
  await committed;
  expect(turns).toEqual([Turn.parse(selectTurn())]);
});
