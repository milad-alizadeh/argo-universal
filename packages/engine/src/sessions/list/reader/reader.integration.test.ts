import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { unstartedWriter } from '#mocks/unstarted-writer';
import { createAcpResources } from '../../../agents';
import { openSessionsMachine } from '../../open-sessions-machine';
import { createSessionList } from '../session-list';
import { createSessionListReader } from './reader';

it('reads one Session with a thousand Turns without fetching its history', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
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
          'id' | 'sessionId' | 'status' | 'startedAt' | 'endedAt' | 'stopReason'
        > => ({
          id: `turn-${index}`,
          sessionId: 'session-1',
          status: 'ended' as const,
          startedAt: index,
          endedAt: index + 1,
          stopReason: 'end_turn' as const,
        }),
      ),
    )
    .run();
  const installedAgents = unlaunchedInstalledAgents(database, directory);
  const counted = countDatabaseReads(database);

  const sessions = createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      hooks: coreOnlyHooks,
      database,
      runtimeDirectory: directory,
      acpResources: createAcpResources(),
      installedAgents,
      writer: unstartedWriter(database),
    },
  });

  const read = createSessionListReader({
    database: counted.database,
    sessions,
    writer: (): undefined => undefined,
  });

  expect(read.readRows(['session-1'])).toMatchObject([
    { information: { sessionId: 'session-1', status: 'idle' }, running: false },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});

it('rejects a malformed cursor before reading Session rows', async (): Promise<void> => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const installedAgents = unlaunchedInstalledAgents(database, directory);
  const counted = countDatabaseReads(database);

  const sessions = createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      hooks: coreOnlyHooks,
      database,
      runtimeDirectory: directory,
      acpResources: createAcpResources(),
      installedAgents,
      writer: unstartedWriter(database),
    },
  });

  const list = createSessionList({ database: counted.database, sessions });

  await expect(
    list.list({ archived: false, cursor: 'bad' }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'Invalid Session list cursor',
  });
  expect(counted.metrics.queries).toBe(0);
});
