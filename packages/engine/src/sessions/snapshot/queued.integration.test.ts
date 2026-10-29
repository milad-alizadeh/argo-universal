import type { SessionSnapshot, UserMessage } from '@repo/contracts';
import { shell, turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { insertSession } from '#mocks/database';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { FeedRowsJob } from '../../feed';
import {
  SessionRowUpdateJob,
  TurnUpdateJob,
} from '../session-storage/session-storage';
import { ShellWriteJob } from '../shells/storage';

const prompt: UserMessage = {
  id: 'prompt',
  sessionId: 'session-1',
  position: 0,
  revision: 1,
  turnId: null,
  state: 'settled',
  sessionUpdate: 'user_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: '\n  Fix the login bug  \nwith a test' }],
};

const promptRows = new FeedRowsJob({
  sessionId: 'session-1',
  rows: [prompt],
  maxRevision: 1,
});

it('shows the prompt title the Writer has queued but not committed', (): void => {
  const host = startSnapshotHost();
  host.write(promptRows);

  const { snapshots } = host.watch('session-1');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(1);
  expect(snapshots).toMatchObject([
    { title: 'Fix the login bug', titleSource: 'prompt', maxRevision: 1 },
  ]);
});

const shellRecord = {
  sessionId: 'child',
  id: 'shell-1',
  toolCallId: 'tool-1',
  command: 'ls',
  cwd: '/project',
  status: 'exited',
  exitCode: 0,
  startedAt: 1,
  endedAt: 2,
  outputBlobId: null,
} as const;

it.each([
  {
    change: 'an Agent title',
    job: new SessionRowUpdateJob({
      id: 'child',
      set: { title: 'Renamed', titleSource: 'agent' },
    }),
    expected: { title: 'Renamed', titleSource: 'agent' },
  },
  {
    change: 'a stored Shell',
    job: new ShellWriteJob(shellRecord),
    expected: { shells: [{ id: 'shell-1', status: 'exited' }] },
  },
])(
  'republishes $change once the Writer commits it, with no Session or Feed event',
  async ({ job, expected }): Promise<void> => {
    const host = startSnapshotHost();
    insertSession(host.database, {
      id: 'child',
      parentSessionId: 'session-1',
      title: 'Review',
    });
    const { snapshots, errors } = host.watch('child');

    host.write(job);
    await waitFor(host.writer, (writer) => writer.matches('idle'));

    await expect
      .poll((): SessionSnapshot | undefined => snapshots.at(-1))
      .toMatchObject(expected);
    expect(errors).toEqual([]);
    expect(host.database.select().from(shell).all()).toHaveLength(
      job instanceof ShellWriteJob ? 1 : 0,
    );
  },
);

it('keeps queued values visible while storage is failing', async (): Promise<void> => {
  const host = startSnapshotHost();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  host.database
    .insert(turn)
    .values({
      id: 'child-turn',
      sessionId: 'child',
      status: 'running',
      startedAt: 1000,
    })
    .run();
  host.write(promptRows);
  host.write(
    new TurnUpdateJob({
      id: 'child-turn',
      set: { status: 'ended', endedAt: 1500, stopReason: 'end_turn' },
    }),
  );
  await host.failWrites('feed_row');

  const { snapshots } = host.watch('session-1');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(2);
  expect(snapshots).toMatchObject([
    {
      title: 'Fix the login bug',
      subagents: [
        {
          sessionId: 'child',
          state: 'idle',
          stopReason: 'end_turn',
          endedAt: 1500,
          durationMs: 500,
        },
      ],
    },
  ]);
});
