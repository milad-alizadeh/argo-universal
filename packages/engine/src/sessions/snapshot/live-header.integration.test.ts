import { randomUUID } from 'node:crypto';
import type { AgentThought, LiveHeader } from '@repo/contracts';
import { feedRow, turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { createActor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { insertSession } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { createAcpResources } from '../../agents';
import { FeedRowsJob, toFeedRowWrite } from '../../feed';
import { createSessionListReader } from '../list/reader';
import { openSessionsMachine } from '../open-sessions-machine';
import { TurnInsertJob } from '../session-storage/session-storage';

type SnapshotHost = ReturnType<typeof startSnapshotHost>;

const thoughtOf = (sessionId: string): AgentThought => ({
  id: `${sessionId}-thought`,
  messageId: `${sessionId}-thought`,
  sessionId,
  turnId: `${sessionId}-turn`,
  position: 1,
  revision: 1,
  state: 'open',
  sessionUpdate: 'agent_thought',
  content: [{ type: 'text', text: '**Checking the tests**' }],
});

const runningTurnOf = (sessionId: string): typeof turn.$inferInsert => ({
  id: `${sessionId}-turn`,
  sessionId,
  status: 'running',
  startedAt: 1000,
});

const checkingTests: LiveHeader = {
  text: 'Checking the tests',
  source: { type: 'thought' },
  startedAt: 1000,
};

function storeRunningTurn(host: SnapshotHost, sessionId: string): void {
  host.database.insert(turn).values(runningTurnOf(sessionId)).run();
  host.database
    .insert(feedRow)
    .values({ ...toFeedRowWrite(thoughtOf(sessionId)), sessionId })
    .run();
}

async function queueRunningTurn(
  host: SnapshotHost,
  sessionId: string,
): Promise<void> {
  host.write(new TurnInsertJob({ turn: runningTurnOf(sessionId) }));
  host.write(
    new FeedRowsJob({
      sessionId,
      rows: [thoughtOf(sessionId)],
      maxRevision: 1,
    }),
  );
  await host.failWrites('feed_row');
}

it.each([
  {
    source: 'stored',
    start: (host: SnapshotHost, sessionId: string): Promise<void> => {
      storeRunningTurn(host, sessionId);

      return Promise.resolve();
    },
  },
  { source: 'queued', start: queueRunningTurn },
])(
  'shows a Subagent whose $source Turn is running as running, with its Live header',
  async ({ start }): Promise<void> => {
    const host = startSnapshotHost();
    insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
    await start(host, 'child');

    const { snapshots, errors } = host.watch('child');

    expect(errors).toEqual([]);
    expect(snapshots.at(-1)).toMatchObject({
      state: 'running',
      activeTurnId: 'child-turn',
      liveHeader: checkingTests,
    });
  },
);

it('shows a Subagent whose latest Turn ended as idle, with no Live header', (): void => {
  const host = startSnapshotHost();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  storeRunningTurn(host, 'child');
  host.database
    .insert(turn)
    .values({
      id: 'child-later',
      sessionId: 'child',
      status: 'ended',
      startedAt: 2000,
      endedAt: 2500,
      stopReason: 'end_turn',
    })
    .run();

  expect(host.watch('child').snapshots.at(-1)).toMatchObject({
    state: 'idle',
    activeTurnId: null,
    liveHeader: null,
  });
});

it('gives the list and the snapshot the same Live header for a running root Session without a Session actor', (): void => {
  const host = startSnapshotHost();
  storeRunningTurn(host, 'session-1');

  const sessions = createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      hooks: coreOnlyHooks,
      database: host.database,
      runtimeDirectory: host.directory,
      acpResources: createAcpResources(),
      installedAgents: unlaunchedInstalledAgents(host.database, host.directory),
      writer: host.writer,
    },
  });

  const listed = createSessionListReader({
    database: host.database,
    sessions,
    writer: (): SnapshotHost['writer'] => host.writer,
  }).readRows(['session-1']);

  expect(listed).toMatchObject([
    { information: { activity: checkingTests.text }, running: true },
  ]);
  expect(host.watch('session-1').snapshots.at(-1)?.liveHeader).toEqual(
    checkingTests,
  );
});
