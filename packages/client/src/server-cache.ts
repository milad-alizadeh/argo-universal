import { LiteThrottler } from '@tanstack/pacer-lite';
import type {
  AsyncStorage as PersisterStorage,
  PersistedQuery,
} from '@tanstack/query-persist-client-core';
import {
  hashKey,
  type Query,
  type QueryClient,
  partialMatchKey,
} from '@tanstack/react-query';
import type { TRPC } from '#features/connection';
import {
  feedKeyPrefix,
  feedKey,
  feedPageSize,
  snapshotKey,
  snapshotKeyPrefix,
} from './features/feed/api/feed-query';
import { keptOnDevice } from './features/feed/api/restore-feed';
import {
  type FeedState,
  keepNewestRows,
} from './features/feed/view/feed-state';
import {
  noteFeedWritten,
  serverCacheKey,
  serverCacheStorage,
  serverQueryPersister,
  takeOldFeeds,
} from './features/servers/server-cache-store';

/*
 * What the App has been sent, kept on the Device so it draws at once after a restart and on a bad Connection
 * (ADR-0045, amended 2026-11-24). A cache, not an offline mode: it is read-only, the Server stays the one source of
 * truth, and a Feed catches up from the revision it holds.
 *
 * TanStack's per-query persister: each kept query restores itself the first time it is fetched, so a Feed read is
 * the only Feed read parsed, and each writes a key of its own when it changes.
 *
 * `maxAge` is the Feed's own time in memory (24 hours). A query's `gcTime` need not match it: the whole-cache
 * persister needs that because it saves what memory still holds, but here a query dropped from memory keeps its key
 * until `persisterGc` finds it past `maxAge`, and is restored from it the next time it is read.
 */

// A Feed changes with every streamed row; its key is rewritten at most this often.
const writeEveryMs = 2000;

// How many Feeds a Server keeps on the Device; the ones written least recently go first, with their snapshots.
const feedsKept = 20;

const pageTreeKey = ['pluginPageTree'] as const;

// The Session list, every Feed and its snapshot, and the Plugin page trees: what a screen waits on before it can draw.
function keptKeys(trpc: TRPC): readonly (readonly unknown[])[] {
  return [
    trpc.session.list.pathKey(),
    feedKeyPrefix,
    snapshotKeyPrefix,
    pageTreeKey,
  ];
}

const hasData = (query: Query): boolean => query.state.data != null;

interface DeviceCache {
  serverId: string;
  // The Device's own storage except where a story slows it down or breaks it.
  storage?: PersisterStorage;
}

const isFeedState = (data: unknown): data is FeedState =>
  typeof data === 'object' && data !== null && 'rows' in data;

// A Feed is kept as its newest page; what is older pages in again, as it does for a Session opened cold.
function trimmed(kept: PersistedQuery): string {
  const { data } = kept.state;

  if (!partialMatchKey(kept.queryKey, feedKeyPrefix) || !isFeedState(data))
    return JSON.stringify(kept);

  const state = { ...kept.state, data: keepNewestRows(data, feedPageSize) };

  return JSON.stringify({ ...kept, state });
}

const persisterOf = ({
  serverId,
  storage,
}: DeviceCache): ReturnType<typeof serverQueryPersister> =>
  serverQueryPersister(serverId, { storage, serialize: trimmed });

// Drops the Feeds beyond the newest `feedsKept`, and the snapshot kept beside each; which they are comes from the Server's index, without reading a Feed.
async function keepNewestFeeds({
  serverId,
  storage = serverCacheStorage(serverId),
}: DeviceCache): Promise<void> {
  const dropped = await takeOldFeeds(serverId, feedsKept, Date.now());

  for (const cacheId of dropped)
    for (const key of [feedKey(cacheId), snapshotKey(cacheId)])
      await storage.removeItem(serverCacheKey(serverId, hashKey(key)));
}

/*
 * Makes the kept queries restore from this Server's cache on the Device the first time each is read. Run once, after
 * `keepServerLists` and before any query is read: a query takes the defaults in force when it first runs. A Feed is
 * also read off the Device ahead of its subscription (`useRestoreFeed`), through the persister left in the defaults'
 * meta.
 */
export function restoreFromDevice(
  queryClient: QueryClient,
  trpc: TRPC,
  cache: DeviceCache,
): void {
  const persister = persisterOf(cache);

  for (const key of keptKeys(trpc)) {
    const defaults = queryClient.getQueryDefaults(key);

    queryClient.setQueryDefaults(key, {
      ...defaults,
      persister: persister.persisterFn,
      meta: { ...defaults.meta, [keptOnDevice]: persister.retrieveQuery },
      // The first read restores from the Device, so it runs with the Connection down; only a read of the Server waits for it.
      networkMode: 'offlineFirst',
    });
  }

  void persister.persisterGc().then(() => keepNewestFeeds(cache));
}

// Writes each kept query to the Device as it changes; the returned function stops, saving what was still waiting.
export function writeToDevice(
  queryClient: QueryClient,
  trpc: TRPC,
  cache: DeviceCache,
): () => void {
  const persister = persisterOf(cache);
  const kept = keptKeys(trpc);
  const writers = new Map<string, LiteThrottler<() => void>>();

  const written = new Set<string>();

  // The first write of a Feed is the one that can take a Server past its limit.
  const write = async (query: Query): Promise<void> => {
    const first = !written.has(query.queryHash);
    written.add(query.queryHash);
    await persister.persistQuery(query);

    if (!partialMatchKey(query.queryKey, feedKeyPrefix)) return;

    await noteFeedWritten(
      cache.serverId,
      String(query.queryKey[2]),
      Date.now(),
    );

    if (first) await keepNewestFeeds(cache);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;

    const { query } = event;

    if (
      !hasData(query) ||
      !kept.some((key) => partialMatchKey(query.queryKey, key))
    )
      return;

    const writer =
      writers.get(query.queryHash) ??
      new LiteThrottler<() => void>(() => void write(query), {
        wait: writeEveryMs,
        // Not at once: a restored query is written with the age the Device kept it at, which the persister sets just after the restore.
        leading: false,
        trailing: true,
      });

    writers.set(query.queryHash, writer);
    writer.maybeExecute();
  });

  return (): void => {
    unsubscribe();

    for (const writer of writers.values()) writer.flush();
  };
}
