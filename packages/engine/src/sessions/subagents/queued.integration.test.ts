import { turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { insertSession } from '#mocks/database';
import { startSnapshotHost } from '#mocks/session-snapshot';
import {
  SessionInsertJob,
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from '../session-storage';
import { createSubagentsReader } from './reader';

const runningTurn = {
  id: 'child-turn',
  sessionId: 'child',
  status: 'running',
  startedAt: 10,
} as const;

const unknownWork = {
  sessionId: 'child',
  parentSessionId: 'session-1',
  readOnly: true,
  toolCallId: null,
  role: null,
  model: null,
  stopReason: null,
  endedAt: null,
  durationMs: null,
  tokens: null,
};

it('shows a Subagent Turn the Writer has ended but not committed', (): void => {
  const host = startSnapshotHost();
  insertSession(host.database, {
    id: 'child',
    parentSessionId: 'session-1',
    title: 'Review',
  });
  host.database.insert(turn).values(runningTurn).run();
  host.write(
    new TurnUpdateJob({
      id: 'child-turn',
      set: {
        status: 'ended',
        endedAt: 24,
        stopReason: 'end_turn',
        usage: { totalTokens: 10, inputTokens: 2, outputTokens: 8 },
      },
    }),
  );

  const { snapshots } = host.watch('session-1');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(1);
  expect(snapshots.map((snapshot) => snapshot.subagents)).toEqual([
    [
      {
        ...unknownWork,
        title: 'Review',
        state: 'idle',
        stopReason: 'end_turn',
        startedAt: 10,
        endedAt: 24,
        durationMs: 14,
        tokens: 10,
      },
    ],
  ]);
  expect(createSubagentsReader(host.sources)('session-1')).toEqual(
    snapshots[0]?.subagents,
  );
});

it('shows a Subagent whose child Session the Writer has queued but not committed', (): void => {
  const host = startSnapshotHost();
  host.write(
    new SessionInsertJob({
      session: {
        id: 'child',
        parentSessionId: 'session-1',
        projectId: 'project-1',
        agent: 'mock',
        checkoutPath: '/project',
        vendorSessionId: 'vendor-child',
        projectionVersion: 1,
      },
    }),
  );
  host.write(
    new SessionRowUpdateJob({
      id: 'child',
      set: { title: 'Review', titleSource: 'agent' },
    }),
  );
  host.write(new TurnInsertJob({ turn: runningTurn }));

  const parent = host.watch('session-1');
  const child = host.watch('child');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(3);
  expect(parent.snapshots.map((snapshot) => snapshot.subagents)).toEqual([
    [{ ...unknownWork, title: 'Review', state: 'running', startedAt: 10 }],
  ]);
  expect(child.errors).toEqual([]);
  expect(child.snapshots).toMatchObject([
    { title: 'Review', titleSource: 'agent', subagents: [] },
  ]);
});
