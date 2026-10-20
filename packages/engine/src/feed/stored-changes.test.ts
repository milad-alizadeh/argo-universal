import type { ChangesSummary, FeedSnapshot } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { afterEach, assert, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { feedMachine, type FeedActorRef } from './feed-machine';
import { StoredChanges } from './stored-changes';

const sessionId = 'session-1';

const totals: ChangesSummary = { files: 3, additions: 5, deletions: 2 };

const storedSnapshot = (title: string): FeedSnapshot => {
  const [recorded] = recordedFeedMocks;
  assert(recorded, 'No recorded Feed');

  return { type: 'snapshot', snapshot: { ...recorded.snapshot, title } };
};

const withTotals = (event: FeedSnapshot): FeedSnapshot => ({
  ...event,
  snapshot: { ...event.snapshot, changes: totals },
});

const openFeed = (): FeedActorRef =>
  createActor(feedMachine, {
    input: {
      sessionId,
      epoch: 1,
      maxRevision: 0,
      nextPosition: 0,
      now: (): number => 0,
      createId: (): string => 'feed-id',
      findWrittenRow: (): undefined => undefined,
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

// One subscription's StoredChanges, with the git read and the Session's Feed in the test's hands.
interface StoredChangesHarness {
  storedChanges: StoredChanges;
  read: PromiseWithResolvers<ChangesSummary>;
  readSummary: () => Promise<ChangesSummary>;
  settled: Promise<FeedSnapshot[]>;
  openSession: () => void;
}

function startStoredChanges(): StoredChangesHarness {
  const read = Promise.withResolvers<ChangesSummary>();
  const settled = Promise.withResolvers<FeedSnapshot[]>();

  const readSummary = vi.fn<() => Promise<ChangesSummary>>(
    async () => read.promise,
  );

  let feed: FeedActorRef | undefined;

  const storedChanges = new StoredChanges(
    {
      findFeed: (): FeedActorRef | undefined => feed,
      readStoredChangesSummary: readSummary,
    },
    sessionId,
    settled.resolve,
  );

  const openSession = (): void => {
    feed = openFeed();
  };

  return {
    storedChanges,
    read,
    readSummary,
    settled: settled.promise,
    openSession,
  };
}

it('sends the newest stored snapshot again with its Checkout totals once read', async () => {
  const { storedChanges, read, settled } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  storedChanges.apply(storedSnapshot('newest'));
  read.resolve(totals);

  expect(await settled).toEqual([withTotals(storedSnapshot('newest'))]);
});

it('gives a later stored snapshot the Checkout totals already read', async () => {
  const { storedChanges, read, settled } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  read.resolve(totals);
  await settled;

  expect(storedChanges.apply(storedSnapshot('later'))).toEqual(
    withTotals(storedSnapshot('later')),
  );
});

it('reads stored Checkout totals from git once', async () => {
  const { storedChanges, read, readSummary, settled } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  storedChanges.apply(storedSnapshot('second'));
  read.resolve(totals);
  await settled;
  storedChanges.apply(storedSnapshot('later'));

  expect(readSummary).toHaveBeenCalledOnce();
});

it('sends nothing again and keeps snapshot totals when git cannot be read', async () => {
  vi.spyOn(console, 'error').mockImplementation((): void => {});
  const { storedChanges, read, settled } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  read.reject(new Error('git failed'));

  expect({
    resent: await settled,
    later: storedChanges.apply(storedSnapshot('later')),
  }).toEqual({ resent: [], later: storedSnapshot('later') });
});

it('reports a failed git read once', async () => {
  const report = vi.spyOn(console, 'error').mockImplementation((): void => {});
  const { storedChanges, read, settled } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  storedChanges.apply(storedSnapshot('second'));
  read.reject(new Error('git failed'));
  await settled;

  expect(report).toHaveBeenCalledOnce();
});

it('sends nothing again for a Session that opened during the read', async () => {
  const { storedChanges, read, settled, openSession } = startStoredChanges();
  storedChanges.apply(storedSnapshot('first'));
  openSession();
  read.resolve(totals);

  expect(await settled).toEqual([]);
});
