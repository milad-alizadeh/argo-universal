import { describe, expect, it } from 'vitest';
import {
  append,
  beforeAppend,
  page,
  rowEvents,
  streamed,
} from '../../../../mocks/feed-state.mocks';
import { feedCacheHarness } from '../../../../mocks/feed/feed-cache.mocks';
import { createQueryClient } from '../../../query-cache';

const { rows, snapshot, stream } = streamed;

const events = rowEvents(stream);

async function holding(h: ReturnType<typeof feedCacheHarness>): Promise<void> {
  h.answer('tail', page([], 0));
  await h.queryClient.fetchQuery(h.cache.tailOptions());
}

describe('FeedCache while a screen shows the Session', () => {
  it('drops the frame it held and everything sent after the reader left', async () => {
    const h = feedCacheHarness();
    const stop = h.cache.start();
    await holding(h);
    const [first, ...rest] = events;

    if (!first) throw new Error('Recorded stream needs a row event');
    h.cache.receive(first);
    stop();

    for (const event of rest) h.cache.receive(event);
    h.cache.receive({ type: 'snapshot', snapshot });
    h.drawFrame();

    expect(h.cache.read().rows).toEqual([]);
    expect(h.cache.readSnapshot()).toBeNull();
  });

  it('drops a row fetched for a showing that stopped, even once shown again', async () => {
    const whole = beforeAppend.rows.find((row) => row.id === append.id);

    if (!whole) throw new Error('Recorded stream needs the appended row');
    const h = feedCacheHarness();
    const stop = h.cache.start();
    await holding(h);
    h.cache.receive(append);
    h.drawFrame();
    stop();
    h.cache.start();
    h.fetches[0]?.resolve(whole);
    await Promise.resolve();
    h.drawFrame();

    expect(h.cache.read().rows).toEqual([]);
  });

  it('drops what reaches the next Session before its screen starts showing it', async () => {
    const queryClient = createQueryClient();
    const left = feedCacheHarness(queryClient, 'session-1');
    const stopLeft = left.cache.start();
    const next = feedCacheHarness(queryClient, 'session-2');
    await holding(next);

    // The left Session's subscription still delivers to the newest render's cache until its effect cleans up.
    for (const event of events) next.cache.receive(event);

    stopLeft();
    next.cache.start();
    next.drawFrame();

    expect(next.cache.read().rows).toEqual([]);
  });
});

// The old store held rows that arrived after a stop and committed them on the next start. The cache holds none: the subscription reopens after the rows written and the Server sends them again.
describe('FeedCache when shown again after a stop', () => {
  it('writes only what the frame wrote and resumes after that revision, not the one it dropped', async () => {
    const h = feedCacheHarness();
    const stop = h.cache.start();
    await holding(h);

    for (const event of events) h.cache.receive(event);
    stop();
    h.cache.start();
    h.drawFrame();

    expect(h.cache.read().rows).toEqual([]);
    expect(h.cache.syncPoint()).toEqual({ epoch: 0, revision: 0 });
  });
});

describe('FeedCache while its page is hidden', () => {
  it('writes nothing while the Session streams', async () => {
    const h = feedCacheHarness();
    const stop = h.cache.start();
    await holding(h);
    stop();
    const writes = h.feedWrites();

    for (const event of events) h.cache.receive(event);
    h.drawFrame();

    expect(h.feedWrites()).toBe(writes);
    expect(h.cache.read().rows).toEqual([]);
  });

  it('resumes at the rows it holds, not where it first opened, when shown again', async () => {
    const h = feedCacheHarness();
    const stop = h.cache.start();
    await holding(h);
    stop();
    h.cache.start();

    for (const event of events) h.cache.receive(event);
    h.drawFrame();

    expect(h.cache.read().rows).toEqual(rows);
    expect(h.cache.syncPoint()).toEqual({
      epoch: 0,
      revision: h.cache.read().revision,
    });
    expect(h.cache.syncPoint()?.revision).toBeGreaterThan(0);
  });
});
