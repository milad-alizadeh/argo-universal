import type { SessionSnapshot } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor } from 'xstate';
import { insertSession } from '#mocks/database';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { FeedRowsJob, feedMachine, type FeedActorRef } from '../../feed';
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

const feedInput = {
  sessionId: 'child',
  epoch: 1,
  maxRevision: 0,
  nextPosition: 0,
  now: (): number => 0,
  createId: (): string => 'feed-id',
  findWrittenRow: (): undefined => undefined,
};

const openFeed = (): FeedActorRef => {
  const feed = createActor(feedMachine, { input: feedInput }).start();
  onTestFinished((): void => {
    feed.stop();
  });

  return feed;
};

interface StreamingSession {
  snapshots: SessionSnapshot[];
  watchSnapshots: () => SessionSnapshot[];
  stream: (chunks: number) => void;
  feedRevision: () => number;
  reattachFeed: () => void;
  rename: (title: string) => void;
}

// A Session shown in the App while its Agent streams, on a real Feed actor.
function watchStreamingSession(): StreamingSession {
  vi.useFakeTimers();
  onTestFinished((): void => {
    vi.useRealTimers();
  });

  const host = startSnapshotHost();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  let feed = openFeed();

  const watch = createSessionSnapshotWatcher({
    ...host.sources,
    findFeed: () => feed,
  });

  const watchSnapshots = (): SessionSnapshot[] => {
    const snapshots: SessionSnapshot[] = [];

    const subscription = watch('child', {
      next: (event): void => {
        if (event.type === 'snapshot') snapshots.push(event.snapshot);
      },
    });

    onTestFinished((): void => {
      subscription.unsubscribe();
    });

    return snapshots;
  };

  const stream = (chunks: number): void => {
    for (let sent = 0; sent < chunks; sent += 1) {
      feed.send(chunk);
      vi.advanceTimersByTime(60);
    }
  };

  return {
    snapshots: watchSnapshots(),
    watchSnapshots,
    stream,
    feedRevision: (): number => feed.getSnapshot().context.maxRevision,
    reattachFeed: (): void => {
      feed = openFeed();
      // The Writer queueing a Feed row announces the Session, as the Session actor's change does for a replaced Feed.
      host.write(
        new FeedRowsJob({ sessionId: 'child', rows: [], maxRevision: 0 }),
      );
      vi.advanceTimersByTime(60);
    },
    rename: (title: string): void => {
      host.database.$client
        .prepare('UPDATE session SET title = ? WHERE id = ?')
        .run(title, 'child');
      feed.send(chunk);
      vi.advanceTimersByTime(60);
    },
  };
}

it('publishes no snapshot for 100 streamed chunks that change only the revision', (): void => {
  const { stream, snapshots, feedRevision } = watchStreamingSession();
  const opened = snapshots.length;
  const openedAt = feedRevision();

  stream(100);

  expect(opened).toBe(1);
  expect(feedRevision() - openedAt).toBeGreaterThanOrEqual(100);
  expect(snapshots).toHaveLength(opened);
});

it('publishes once when another field changes after streaming, with the latest revision', (): void => {
  const { stream, snapshots, rename, feedRevision } = watchStreamingSession();

  stream(100);
  const quiet = snapshots.length;
  rename('Renamed');

  expect(snapshots).toHaveLength(quiet + 1);
  expect(snapshots.at(-1)).toMatchObject({
    title: 'Renamed',
    maxRevision: feedRevision(),
  });
  expect(feedRevision()).toBeGreaterThanOrEqual(101);
});

it('publishes a fresh snapshot to a new watcher and when the Feed actor is replaced', (): void => {
  const { stream, snapshots, watchSnapshots, reattachFeed } =
    watchStreamingSession();

  stream(100);
  const quiet = snapshots.length;
  const resumed = watchSnapshots();

  expect(resumed).toHaveLength(1);
  expect(resumed[0]?.maxRevision).toBeGreaterThanOrEqual(100);

  reattachFeed();

  expect(snapshots).toHaveLength(quiet + 1);
  expect(resumed).toHaveLength(2);
});
