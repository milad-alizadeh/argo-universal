import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import {
  countDatabaseReads,
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { unstartedWriter } from '#mocks/unstarted-writer';
import { createAcpResources } from '../../../agents';
import { FeedRowsJob } from '../../../feed';
import { writeJobs } from '../../../storage';
import { openSessionsMachine } from '../../open-sessions-machine';
import { createSubagentsReader } from '../../subagents';
import { createSessionListReader } from './reader';

it('reads the existence of a running Subagent Turn without fetching Turn history', (): void => {
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
  const sessions = listSessions(database, directory);
  const counted = countDatabaseReads(database);

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
  expect(counted.metrics.queries).toBeLessThanOrEqual(6);
  expect(counted.metrics.rows).toBeLessThanOrEqual(4);
});

it('counts an active Agent reported by ACP even when its latest Turn ended', (): void => {
  const { database, directory, remove } = openTestDatabase();

  onTestFinished(remove);
  insertEndedTurn(database);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  database
    .insert(turn)
    .values({
      id: 'child-turn',
      sessionId: 'child-1',
      status: 'ended',
      startedAt: 1,
    })
    .run();
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      maxRevision: 1,
      rows: [
        {
          id: 'agent-running',
          sessionId: 'session-1',
          sessionUpdate: 'subagent_update',
          subagentSessionId: 'child-1',
          subagentState: 'running',
          position: 0,
          revision: 1,
          turnId: null,
          state: 'settled',
        },
      ],
    }),
  ]);

  const agents = createSubagentsReader({
    database,
    findWriter: (): undefined => undefined,
    findFeed: (): undefined => undefined,
  })('session-1');

  expect(agents).toMatchObject([{ state: 'running' }]);

  const reader = createSessionListReader({
    database,
    sessions: listSessions(database, directory),
    writer: (): undefined => undefined,
  });

  expect(reader.readRows(['session-1'])[0]?.information.subagents).toEqual({
    total: 1,
    running: 1,
  });
});

function listSessions(
  database: ReturnType<typeof openTestDatabase>['database'],
  directory: string,
): ReturnType<typeof createActor<typeof openSessionsMachine>> {
  return createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      hooks: coreOnlyHooks,
      database,
      runtimeDirectory: directory,
      acpResources: createAcpResources(),
      installedAgents: unlaunchedInstalledAgents(database, directory),
      writer: unstartedWriter(database),
    },
  });
}
