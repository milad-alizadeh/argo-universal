import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import {
  countDatabaseReads,
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { createAcpResources } from '../../../agents';
import { openSessionsMachine } from '../../open-sessions-machine';
import { createSessionListReader } from './reader';

it('reads the existence of a running Subagent Turn without fetching its history', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  insertEndedTurn(database);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  database
    .insert(turn)
    .values(
      Array.from(
        { length: 1000 },
        (
          _,
          index,
        ): Pick<
          typeof turn.$inferSelect,
          'id' | 'sessionId' | 'status' | 'startedAt'
        > => ({
          id: `child-turn-${index}`,
          sessionId: 'child-1',
          status: 'running' as const,
          startedAt: index,
        }),
      ),
    )
    .run();
  const counted = countDatabaseReads(database);

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
    database: counted.database,
    sessions,
    writer: (): undefined => undefined,
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
  expect(counted.metrics.rows).toBeLessThanOrEqual(4);
});
