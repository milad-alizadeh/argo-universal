import { LiteThrottler } from '@tanstack/pacer-lite';
import type { AsyncStorage as PersisterStorage } from '@tanstack/query-persist-client-core';
import {
  type Query,
  type QueryClient,
  partialMatchKey,
} from '@tanstack/react-query';
import type { TRPC } from '#features/connection';
import {
  feedKeyPrefix,
  snapshotKeyPrefix,
} from './features/feed/api/feed-query';
import { serverQueryPersister } from './features/servers/server-cache-store';

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
  // The Device's own storage except where a story slows it down.
  storage?: PersisterStorage;
}

/*
 * Makes the kept queries restore from this Server's cache on the Device the first time each is read. Run once, after
 * `keepServerLists` and before any query is read: a query takes the defaults in force when it first runs.
 */
export function restoreFromDevice(
  queryClient: QueryClient,
  trpc: TRPC,
  { serverId, storage }: DeviceCache,
): void {
  const persister = serverQueryPersister(serverId, storage);

  for (const key of keptKeys(trpc))
    queryClient.setQueryDefaults(key, {
      ...queryClient.getQueryDefaults(key),
      persister: persister.persisterFn,
      // The first read restores from the Device, so it runs with the Connection down; only a read of the Server waits for it.
      networkMode: 'offlineFirst',
    });

  void persister.persisterGc();
}

// Writes each kept query to the Device as it changes; the returned function stops, saving what was still waiting.
export function writeToDevice(
  queryClient: QueryClient,
  trpc: TRPC,
  { serverId, storage }: DeviceCache,
): () => void {
  const persister = serverQueryPersister(serverId, storage);
  const kept = keptKeys(trpc);
  const writers = new Map<string, LiteThrottler<() => void>>();

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
      new LiteThrottler<() => void>(() => void persister.persistQuery(query), {
        wait: writeEveryMs,
        leading: true,
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
