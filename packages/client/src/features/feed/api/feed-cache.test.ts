import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import {
  type FeedCacheHarness,
  feedCacheHarness,
} from '../../../../mocks/feed/feed-cache.mocks';
import { createQueryClient } from '../../../query-cache';
import { resumeAfter } from './feed-cache';

const { rows, snapshot, stream } = streamed;

const tail = page(rows, snapshot.maxRevision);

const resumeAt = { epoch: 0, revision: snapshot.maxRevision };

// The screen showing the Session: it holds the Feed's query open, as the hook does.
function show(h: FeedCacheHarness, enabled = false): () => void {
  const observer = new QueryObserver(h.queryClient, {
    ...h.cache.tailOptions(),
    enabled,
  });
  const unsubscribe = observer.subscribe(() => {});
  const stop = h.cache.start();

  return (): void => {
    stop();
    unsubscribe();
  };
}

async function opened(h: FeedCacheHarness): Promise<void> {
  h.answer('tail', tail);
  await h.queryClient.fetchQuery(h.cache.tailOptions());
}

describe('FeedCache', () => {
  it('holds the tail page as the window and resumes live changes after it', async () => {
    const h = feedCacheHarness();
    show(h);
    await opened(h);
    h.cache.receive({ type: 'snapshot', snapshot });

    expect(h.cache.readSnapshot()).toBeNull();
    h.drawFrame();
    expect(h.cache.read().rows).toEqual(rows);
    expect(h.cache.readSnapshot()).toEqual(snapshot);
    expect(h.cache.syncPoint()).toEqual(resumeAt);
  });

  it('writes a snapshot with the rows of its frame, not before', async () => {
    const h = feedCacheHarness();
    show(h);
    h.answer('tail', page([], 0));
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    h.cache.receive({ type: 'snapshot', snapshot });
    h.drawFrame();
    const before = h.feedWrites();

    for (const event of rowEvents(stream)) h.cache.receive(event);
    h.cache.receive({
      type: 'snapshot',
      snapshot: { ...snapshot, title: 'A' },
    });
    h.cache.receive({
      type: 'snapshot',
      snapshot: { ...snapshot, title: 'B' },
    });

    expect(h.cache.readSnapshot()).toBe(snapshot);
    h.drawFrame();
    expect(h.feedWrites() - before).toBe(1);
    expect(h.cache.readSnapshot()?.title).toBe('B');
  });

  it('keeps the snapshot it holds when the next one is equal', async () => {
    const h = feedCacheHarness();
    show(h);
    await opened(h);
    h.cache.receive({ type: 'snapshot', snapshot });
    h.drawFrame();
    const held = h.cache.readSnapshot();

    h.cache.receive({ type: 'snapshot', snapshot: { ...snapshot } });
    h.drawFrame();

    expect(h.cache.readSnapshot()).toBe(held);
  });

  it('writes a burst of live events once per frame', async () => {
    const h = feedCacheHarness();
    show(h);
    h.answer('tail', page([], 0));
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    const before = h.feedWrites();

    for (const event of rowEvents(stream)) h.cache.receive(event);
    expect(h.feedWrites()).toBe(before);
    h.drawFrame();

    expect(h.feedWrites() - before).toBe(1);
    expect(h.cache.read().rows).toEqual(rows);
  });

  it('draws a Session seen before at once from the cache, with no page read', async () => {
    const queryClient = createQueryClient();
    const first = feedCacheHarness(queryClient);
    const leave = show(first);
    await opened(first);
    first.cache.receive({ type: 'snapshot', snapshot });
    first.drawFrame();
    leave();

    const back = feedCacheHarness(queryClient);
    show(back, true);
    await Promise.resolve();

    expect(back.cache.read().rows).toEqual(rows);
    expect(back.cache.readSnapshot()).toEqual(snapshot);
    expect(back.cache.syncPoint()).toEqual(resumeAt);
    expect(back.pageReads).toEqual([]);
  });

  it('keeps another Session out of the cache of this one', async () => {
    const queryClient = createQueryClient();
    const first = feedCacheHarness(queryClient, 'session-1');
    show(first);
    await opened(first);

    const other = feedCacheHarness(queryClient, 'session-2');

    expect(other.cache.read().rows).toEqual([]);
    expect(other.cache.syncPoint()).toBeNull();
  });

  it('never goes stale on a clock, and is kept far longer than ten minutes', () => {
    const h = feedCacheHarness();
    const options = h.queryClient.defaultQueryOptions(h.cache.tailOptions());

    expect(options.staleTime).toBe(Infinity);
    expect(options.gcTime).toBeGreaterThan(10 * 60_000);
    expect(h.queryClient.getQueryDefaults(h.cache.key).structuralSharing).toBe(
      false,
    );
  });

  it('takes nothing before it starts showing the Session', async () => {
    const h = feedCacheHarness();
    await opened(h);

    for (const event of rowEvents(stream)) h.cache.receive(event);
    h.drawFrame();

    expect(h.cache.read().rows).toEqual(rows);
    expect(h.feedWrites()).toBe(1);
  });
});

describe('FeedCache resuming live changes', () => {
  it('reopens after the newest revision the cache holds, not where it first opened', async () => {
    const h = feedCacheHarness();
    show(h);
    h.answer('tail', page([], 0));
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    const opening = h.cache.syncPoint();

    for (const event of rowEvents(stream)) h.cache.receive(event);
    h.drawFrame();
    const resumed = resumeAfter(opening, h.cache.syncPoint());

    expect(opening).toEqual({ epoch: 0, revision: 0 });
    expect(resumed).toEqual({ point: resumeAt, restart: false });
  });

  it('restarts the subscription at the same point when no rows arrived since', async () => {
    const h = feedCacheHarness();
    show(h);
    await opened(h);

    expect(resumeAfter(h.cache.syncPoint(), h.cache.syncPoint())).toEqual({
      point: resumeAt,
      restart: true,
    });
  });

  it('opens nothing before the Feed has rows to resume after', () => {
    const h = feedCacheHarness();

    expect(resumeAfter(null, h.cache.syncPoint())).toEqual({
      point: null,
      restart: false,
    });
  });

  it('writes nothing when a Session that has finished sends no rows after the cached revision', async () => {
    const h = feedCacheHarness();
    show(h);
    await opened(h);
    h.cache.receive({ type: 'snapshot', snapshot });
    h.drawFrame();
    const writes = h.feedWrites();
    const held = h.cache.read();

    // A reconnect asks after the cached revision; the Server has nothing newer, so nothing arrives.
    const { point } = resumeAfter(null, h.cache.syncPoint());
    h.drawFrame();

    expect(point).toEqual(resumeAt);
    expect(h.feedWrites()).toBe(writes);
    expect(h.cache.read()).toBe(held);
  });
});
