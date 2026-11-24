import { QueryClient } from '@tanstack/react-query';
import type { TRPC } from '#features/connection';
import {
  feedKeyPrefix,
  feedQueryDefaults,
  snapshotKeyPrefix,
  snapshotQueryDefaults,
} from './features/feed/api/feed-query';

const minuteMs = 60_000,
  minutesKept = 30;

const keptFor = minutesKept * minuteMs;

const hoursKept = 24;

// A Plugin page's tree is asked for again behind the kept one on every visit, so keeping it costs one stale draw and saves the first draw from waiting on a Plugin start and its Loader's reads.
const pageTreesKeptFor = hoursKept * 60 * minuteMs;

/*
 * The Server's own lists: each is what a list screen waits on before it can draw a row, and each changes
 * far more slowly than a reader moves between pages. React Query drops a query nothing is watching after
 * five minutes, so leaving a page and coming back to it made the screen wait on the Server again; these
 * stay in memory long enough that the second visit draws its rows at once (owner, 2026-10-21).
 *
 * In memory only: nothing is written to the Device, so a cold start loads from the Server as it always did.
 */
const listsFreshFor = 30_000;

/*
 * Each kept list is named through the real tRPC proxy, so a renamed procedure cannot leave its key dead (finding 8 of #2685).
 * A kept list is still asked for again on every visit; what it keeps is what the reader sees meanwhile.
 */
export function keepServerLists(queryClient: QueryClient, trpc: TRPC): void {
  for (const key of [
    trpc.agent.list.pathKey(),
    trpc.registry.get.pathKey(),
    trpc.project.list.pathKey(),
    trpc.session.list.pathKey(),
    trpc.system.info.pathKey(),
  ])
    queryClient.setQueryDefaults(key, {
      gcTime: keptFor,
      staleTime: listsFreshFor,
    });
}

export function createQueryClient(): QueryClient {
  const client = new QueryClient();

  client.setQueryDefaults(['pluginPageTree'], { gcTime: pageTreesKeptFor });

  // A Feed is kept current by its subscription, so it is never stale on a clock.
  client.setQueryDefaults(feedKeyPrefix, feedQueryDefaults);
  client.setQueryDefaults(snapshotKeyPrefix, snapshotQueryDefaults);

  return client;
}
