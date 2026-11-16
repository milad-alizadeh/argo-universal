import { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import {
  cacheOverMemory,
  issues,
  onScreen,
  rowsOf,
  settled,
} from './page-addresses-fixtures';
import {
  pageAddressesFor,
  type PageConnection,
} from './page-addresses-registry';
import type { DrawPage } from './tree-draws';

const connectionOver = (draw: DrawPage): PageConnection => ({
  plugins: {
    draw: { query: draw },
    live: {
      subscribe: vi.fn<PageConnection['plugins']['live']['subscribe']>(),
    },
  },
});

const unused: DrawPage = () => Promise.reject(new Error('Nothing is drawn'));

it('shares one instance under one QueryClient and Connection', () => {
  const queryClient = new QueryClient();
  const connection = connectionOver(unused);

  expect(pageAddressesFor(queryClient, connection)).toBe(
    pageAddressesFor(queryClient, connection),
  );
});

it('gives a different QueryClient or Connection its own instance', () => {
  const queryClient = new QueryClient();
  const connection = connectionOver(unused);
  const shared = pageAddressesFor(queryClient, connection);

  expect(pageAddressesFor(new QueryClient(), connection)).not.toBe(shared);
  expect(pageAddressesFor(queryClient, connectionOver(unused))).not.toBe(
    shared,
  );
});

it('marks a draw in flight on one lookup when a stale mark arrives on another', async () => {
  const cache = cacheOverMemory();
  const connection = connectionOver(cache.server.draw);
  // The page and the frame each look the instance up, as two hook calls do.
  const page = pageAddressesFor(cache.client, connection);
  const frame = pageAddressesFor(cache.client, connection);
  const screen = onScreen({ ...cache, addresses: page }, issues);

  await settled();
  cache.server.hold();

  const loading = page.loadMore(issues);

  await settled();
  cache.server.write();
  frame.markStale({ pluginId: 'tracker' });
  cache.server.release();
  await loading;
  await settled();

  expect(rowsOf(screen.answer())[0]?.props.edition).toBe(1);
  screen.leave();
});
