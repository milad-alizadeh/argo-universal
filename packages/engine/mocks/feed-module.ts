import type { Database } from '@repo/db';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { createActor } from 'xstate';
import { createEngineContext } from '../src/engine/context';
import { appRouter } from '../src/engine/router';
import { findMachineActor } from '../src/lib/machine-actor';
import {
  feedMachine,
  readQueuedFeedRow,
  readWrittenRow,
  type FeedActorRef,
} from '../src/services/feed';
import { createSessionSnapshotWatcher } from '../src/services/sessions';
import { sessionActorId, sessionMachine } from '../src/services/sessions';
import { databaseWriterId, writerMachine } from '../src/storage';
import { waitForAcpSessionIdle } from './acp-feed';
import { startEngineTestHost } from './engine';
import { scriptedEngineInput } from './scripted-engine';

// The exported Feed module accepts FeedChange inputs with real Writer, SQLite and Session snapshots.
export const startFeedModuleTestHost = async ({
  database,
  runtimeDirectory,
  scenario = { steps: [] },
  agent = 'mock',
}: {
  database: Database;
  runtimeDirectory: string;
  scenario?: ScriptedScenario;
  agent?: string;
}): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    feed: FeedActorRef;
    agent: ReturnType<typeof scriptedEngineInput>['agent'];
  }
> => {
  let identity = 0;
  const input = scriptedEngineInput(
    { ...scenario, sessionIds: ['vendor-1'] },
    agent,
  );
  const host = await startEngineTestHost({
    database,
    runtimeDirectory,
    createId: () => (++identity === 1 ? 'turn-1' : `feed-fixture-${identity}`),
    ...input,
  });
  host.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent,
  });
  await waitForAcpSessionIdle(host, 'session-1');
  const count = database.$client
    .prepare('SELECT count(*) AS count FROM feed_row WHERE session_id = ?')
    .get('session-1');
  if (typeof count?.count !== 'number')
    throw new Error('Stored Feed row count is missing');
  const feed = createActor(feedMachine, {
    parent: host.engine,
    input: {
      sessionId: 'session-1',
      epoch: 3,
      maxRevision: count.count,
      nextPosition: count.count,
      now: Date.now,
      findWrittenRow: (id) =>
        readWrittenRow({
          database: host.database,
          pending: readQueuedFeedRow(
            findMachineActor(
              host.engine.system,
              databaseWriterId,
              writerMachine,
            ),
            { sessionId: 'session-1', id },
          ),
          sessionId: 'session-1',
          id,
        }),
    },
  }).start();
  return { ...host, feed, agent: input.agent };
};

export const createFeedModuleCaller = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  feed: FeedActorRef | undefined,
  signal: AbortSignal,
): ReturnType<typeof appRouter.createCaller> => {
  const context = createEngineContext({
    database: host.database,
    sessions: host.sessionRegistry,
    databaseWriter: host.databaseWriter,
    blobsFolder: host.blobsFolder,
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
    sessionCommandSignal: signal,
    syncSupervisor: host.engine.system.get('syncSupervisor'),
  });
  const findFeed = (sessionId: string): FeedActorRef | undefined =>
    sessionId === 'session-1' && feed ? feed : context.findFeed(sessionId);
  return appRouter.createCaller(
    {
      ...context,
      findFeed,
      watchSessionSnapshot: createSessionSnapshotWatcher({
        database: context.database,
        findFeed,
        findWriter: context.findWriter,
        findSession: (sessionId) =>
          findMachineActor(
            host.engine.system,
            sessionActorId(sessionId),
            sessionMachine,
          ),
        sessions: host.sessionRegistry,
      }),
    },
    { signal },
  );
};
