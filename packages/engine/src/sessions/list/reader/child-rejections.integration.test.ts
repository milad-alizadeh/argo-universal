import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor } from 'xstate';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { createAcpResources } from '../../../agents';
import { openSessionsMachine } from '../../open-sessions-machine';
import { createSessionListReader } from './reader';

it('excludes only the Subagent with a malformed latest Turn from its healthy parent', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);

  const report = vi
    .spyOn(console, 'error')
    .mockImplementation((): undefined => undefined);

  onTestFinished((): void => report.mockRestore());
  insertEndedTurn(database);
  insertSession(database, { id: 'bad-child', parentSessionId: 'session-1' });
  insertSession(database, {
    id: 'healthy-child',
    parentSessionId: 'session-1',
  });
  database
    .insert(turn)
    .values([
      {
        id: 'bad-turn',
        sessionId: 'bad-child',
        status: 'running',
        startedAt: 2,
      },
      {
        id: 'healthy-turn',
        sessionId: 'healthy-child',
        status: 'running',
        startedAt: 1,
      },
    ])
    .run();
  database
    .update(turn)
    .set({ status: sql`'invalid'` })
    .where(eq(turn.id, 'bad-turn'))
    .run();

  const sessions = createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database,
      runtimeDirectory: directory,
      acpResources: createAcpResources(),
    },
  });

  const reader = createSessionListReader({
    database,
    sessions,
    writer: (): undefined => undefined,
  });

  expect(reader.readRows(['session-1'])).toMatchObject([
    {
      information: {
        sessionId: 'session-1',
        status: 'idle',
        subagents: { total: 1, running: 1 },
      },
    },
  ]);
  expect(report).toHaveBeenCalledTimes(1);
});
