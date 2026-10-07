import { turn } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { registryMachine } from './registry-machine';
import { createSessionListReader } from './session-list-reader';

it('reads one Session with a thousand Turns without fetching its history', () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  database
    .insert(turn)
    .values(
      Array.from({ length: 1000 }, (_, index) => ({
        id: `turn-${index}`,
        sessionId: 'session-1',
        status: 'ended' as const,
        startedAt: index,
        endedAt: index + 1,
        stopReason: 'end_turn' as const,
      })),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: { database, adapters: [] },
  });
  const read = createSessionListReader({
    database: counted.database,
    sessions,
    writer: () => undefined,
  });
  expect(read.readRows(['session-1'])).toMatchObject([
    { information: { sessionId: 'session-1', status: 'idle' }, running: false },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});

it('reads the existence of a running Subagent Turn without fetching its history', () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  database
    .insert(turn)
    .values(
      Array.from({ length: 1000 }, (_, index) => ({
        id: `child-turn-${index}`,
        sessionId: 'child-1',
        status: 'running' as const,
        startedAt: index,
      })),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: { database, adapters: [] },
  });
  const reader = createSessionListReader({
    database: counted.database,
    sessions,
    writer: () => undefined,
  });
  expect(reader.readRows(['session-1'])).toMatchObject([
    {
      information: {
        sessionId: 'session-1',
        subagents: { total: 1, running: 1 },
      },
    },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});
