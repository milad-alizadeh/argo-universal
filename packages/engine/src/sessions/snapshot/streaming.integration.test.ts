import type { SessionSnapshot } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor } from 'xstate';
import { insertSession } from '#mocks/database';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { feedMachine } from '../../feed';
import { createSessionSnapshotWatcher } from './observer';

const chunk = {
  type: 'feed.acpUpdate',
  acpSessionId: 'acp-1',
  turnId: null,
  update: {
    sessionUpdate: 'agent_message_chunk',
    messageId: 'reply',
    content: { type: 'text', text: 'x' },
  },
} as const;

// A Session shown in the App while its Agent streams, on a real Feed actor.
function watchStreamingSession(): {
  stream: (chunks: number) => void;
  snapshots: SessionSnapshot[];
} {
  vi.useFakeTimers();
  onTestFinished(() => vi.useRealTimers());
  const host = startSnapshotHost();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  const feed = createActor(feedMachine, {
    input: {
      sessionId: 'child',
      epoch: 1,
      maxRevision: 0,
      nextPosition: 0,
      now: (): number => 0,
      createId: (): string => 'feed-id',
      findWrittenRow: (): undefined => undefined,
    },
  }).start();
  onTestFinished(() => feed.stop());
  const watch = createSessionSnapshotWatcher({
    ...host.sources,
    findFeed: () => feed,
  });
  const snapshots: SessionSnapshot[] = [];
  const subscription = watch('child', {
    next: (event): void => {
      if (event.type === 'snapshot') snapshots.push(event.snapshot);
    },
  });
  onTestFinished(() => subscription.unsubscribe());

  return {
    snapshots,
    stream: (chunks): void => {
      for (let sent = 0; sent < chunks; sent += 1) {
        feed.send(chunk);
        vi.advanceTimersByTime(60);
      }
    },
  };
}

it('publishes no snapshot for 100 streamed chunks that change only the revision', (): void => {
  const { stream, snapshots } = watchStreamingSession();
  const opened = snapshots.length;

  stream(100);

  expect(opened).toBe(1);
  expect(snapshots).toHaveLength(opened);
});
