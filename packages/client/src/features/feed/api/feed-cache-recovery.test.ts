import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  append,
  beforeAppend,
  page,
  streamed,
} from '../../../../mocks/feed-state.mocks';
import {
  type FeedCacheHarness,
  feedCacheHarness,
} from '../../../../mocks/feed/feed-cache.mocks';

const { rows, snapshot } = streamed;

const tail = page(rows, snapshot.maxRevision);

async function opened(h: FeedCacheHarness): Promise<void> {
  const observer = new QueryObserver(h.queryClient, {
    ...h.cache.tailOptions(),
    enabled: false,
  });
  observer.subscribe(() => {});
  h.cache.start();
  h.answer('tail', tail);
  await h.queryClient.fetchQuery(h.cache.tailOptions());
}

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

describe('FeedCache when the Server rebuilds the Feed', () => {
  it('drops the rows held and pages the new epoch from its tail', async () => {
    const h = feedCacheHarness();
    await opened(h);
    h.answer('tail', { ...tail, epoch: 1 });
    const reads = h.pageReads.length;

    h.cache.receive({ type: 'reset', epoch: 1 });
    h.drawFrame();
    await settle();

    expect(h.pageReads.slice(reads)).toEqual([{ direction: 'tail' }]);
    expect(h.cache.read()).toMatchObject({ epoch: 1, rows });
  });

  it('shows no rows of the old epoch meanwhile', async () => {
    const h = feedCacheHarness();
    await opened(h);
    h.answer('tail', { ...tail, epoch: 1 });

    h.cache.receive({ type: 'reset', epoch: 1 });
    h.drawFrame();

    expect(h.cache.read()).toMatchObject({ epoch: 1, rows: [] });
  });
});

describe('FeedCache when a change misses its row', () => {
  it('fetches the row whole and writes it at the next frame', async () => {
    const h = feedCacheHarness();
    h.cache.start();
    h.answer('tail', page([], 0));
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    h.cache.receive(append);
    h.drawFrame();
    const whole = beforeAppend.rows.find((row) => row.id === append.id);

    if (!whole) throw new Error('Recorded stream needs the appended row');
    expect(h.fetches.map((fetch) => fetch.id)).toEqual([append.id]);
    h.fetches[0]?.resolve(whole);
    await settle();
    h.drawFrame();

    expect(h.cache.read().rows).toEqual([whole]);
  });

  it('keeps the rows it holds when fetching a row whole fails', async () => {
    const h = feedCacheHarness();
    h.cache.start();
    h.answer('tail', page([], 0));
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    h.cache.receive(append);
    h.drawFrame();
    h.fetches[0]?.reject(new Error('Server gone'));
    await settle();
    h.drawFrame();

    expect(h.cache.read().rows).toEqual([]);
  });
});

describe('FeedCache loading older history', () => {
  it('merges the page before the window into the same query', async () => {
    const older = page(rows, snapshot.maxRevision, { limit: 2 });
    const h = feedCacheHarness();
    h.cache.start();
    h.answer('tail', { ...older, hasOlder: true });
    await h.queryClient.fetchQuery(h.cache.tailOptions());
    const window = h.cache.read();
    const before = page(rows, snapshot.maxRevision, {
      before: window.startCursor ?? 0,
      limit: 2,
    });
    h.answer('before', before);

    await h.cache.loadOlder();

    expect(h.pageReads.at(-1)).toEqual({
      direction: 'before',
      cursor: window.startCursor,
      epoch: 0,
    });
    expect(h.cache.read().rows.length).toBeGreaterThan(window.rows.length);
  });

  it('asks for nothing when there is no older history', async () => {
    const h = feedCacheHarness();
    await opened(h);
    const reads = h.pageReads.length;

    await h.cache.loadOlder();

    expect(h.pageReads).toHaveLength(reads);
  });
});
