import type { PageState } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import type { PageOpening } from './page-addresses';
import {
  cacheOverMemory,
  issues,
  kept,
  onScreen,
  rowsOf,
  settled,
} from './page-addresses-fixtures';

it('draws an address whole, then keeps the very same answer when a draw finds nothing changed', async () => {
  const cache = cacheOverMemory();
  const screen = onScreen(cache, issues);

  await settled();
  const first = screen.answer();

  cache.addresses.markStale({ pluginId: 'tracker' });
  await settled();

  expect(cache.server.answers.map(({ kind }) => kind)).toEqual([
    'tree',
    'unchanged',
  ]);
  expect(cache.server.requests[1]).toMatchObject({
    pages: 1,
    known: kept(first).hash,
  });
  expect(screen.answer()).toBe(first);
  screen.leave();
});

it('asks for one page more on a load more, naming the kept hash, and appends its rows to the kept tree', async () => {
  const cache = cacheOverMemory();
  const screen = onScreen(cache, issues);

  await settled();
  const first = screen.answer();

  await cache.addresses.loadMore(issues);

  expect(cache.server.requests.at(-1)).toMatchObject({
    pages: 2,
    known: kept(first).hash,
  });
  expect(cache.server.answers.at(-1)?.kind).toBe('append');
  expect(kept(screen.answer()).pages).toBe(2);
  expect(rowsOf(screen.answer()).map(({ key }) => key)).toEqual([
    '/issues#0',
    '/issues#1',
    '/issues#2',
    '/issues#3',
  ]);
  expect(rowsOf(screen.answer())[0]).toBe(rowsOf(first)[0]);
  screen.leave();
});

it('shows a new Page state only once its address has drawn', async () => {
  const cache = cacheOverMemory();

  const stateOf = (): PageState | undefined =>
    cache.client.getQueryData(cache.addresses.state(issues).queryKey);

  await cache.addresses.change(issues, { query: 'bug' });

  expect(cache.server.requests.at(-1)?.pageState).toEqual({ query: 'bug' });
  expect(stateOf()).toEqual({ query: 'bug' });

  cache.server.hold();
  const changing = cache.addresses.change(issues, { query: 'crash' });

  await settled();
  expect(stateOf()).toEqual({ query: 'bug' });
  cache.server.release();
  await changing;
  expect(stateOf()).toEqual({ query: 'crash' });
});

it('reads the first page again for an empty change, as a pull, and keeps the pages already loaded', async () => {
  const cache = cacheOverMemory();

  await cache.addresses.change(issues, { query: 'bug' });

  const screen = onScreen(cache, issues);

  await settled();
  expect(kept(screen.answer()).root.props.title).toBe('bug');

  await cache.addresses.loadMore(issues);
  await cache.addresses.change(issues, {});

  expect(cache.server.requests.at(-1)).toMatchObject({
    pageState: { query: 'bug' },
    pages: 2,
    pull: true,
  });
  expect(kept(screen.answer()).pages).toBe(2);
  screen.leave();
});

it('keeps Page state apart for each Project and Session a page opens for', async () => {
  const cache = cacheOverMemory();
  const inSession = { ...issues, sessionId: 'one' };

  const stateAt = (opening: PageOpening): PageState | undefined =>
    cache.client.getQueryData(cache.addresses.state(opening).queryKey);

  await cache.addresses.change(inSession, { query: 'bug' });

  expect(stateAt(inSession)).toEqual({ query: 'bug' });
  expect(stateAt({ ...inSession, sessionId: 'two' })).toBeUndefined();
  expect(stateAt({ ...inSession, projectId: 'site' })).toBeUndefined();
  expect(stateAt(issues)).toBeUndefined();
});

it('merges Page state changes that overlap, so a search and a tab asked together both stay', async () => {
  const cache = cacheOverMemory();

  const stateOf = (): PageState | undefined =>
    cache.client.getQueryData(cache.addresses.state(issues).queryKey);

  cache.server.hold();

  const search = cache.addresses.change(issues, { query: 'bug' });
  const tab = cache.addresses.change(issues, { tab: 'open' });

  await settled();
  cache.server.release();
  await Promise.all([search, tab]);

  expect(stateOf()).toEqual({ query: 'bug', tab: 'open' });
  expect(cache.server.requests.at(-1)?.pageState).toEqual({
    query: 'bug',
    tab: 'open',
  });
});

it('keeps the Page state asked last when an earlier change draws more slowly', async () => {
  const cache = cacheOverMemory();

  const stateOf = (): PageState | undefined =>
    cache.client.getQueryData(cache.addresses.state(issues).queryKey);

  cache.server.hold();

  const first = cache.addresses.change(issues, { query: 'b' });
  const last = cache.addresses.change(issues, { query: 'bug' });

  await settled();
  cache.server.releaseNewestFirst();
  await Promise.all([first, last]);

  expect(stateOf()).toEqual({ query: 'bug' });
});
