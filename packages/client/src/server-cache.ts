import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { partialMatchKey } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import type { TRPC } from '#features/connection';
import {
  feedKeyPrefix,
  snapshotKeyPrefix,
} from './features/feed/api/feed-query';

/*
 * What the App has been sent, kept on the Device so it draws at once after a restart and on a bad Connection
 * (ADR-0045, amended 2026-11-24). A cache, not an offline mode: it is read-only, the Server stays the one source of
 * truth, and a Feed catches up from the revision it holds.
 *
 * TanStack's own persister over the storage the App already uses: AsyncStorage on a phone, and on the web
 * AsyncStorage's own localStorage. Each Server has a key of its own, as it has a QueryClient of its own.
 */
type PersistOptions = PersistQueryClientProviderProps['persistOptions'];

const hourMs = 3_600_000;

// As long as the Feed's own time in memory; older than this is the Server's to say again.
const keptFor = 24 * hourMs;

const writeEveryMs = 2000;

const slackMs = 500;

const wipeAgainAfterMs = writeEveryMs + slackMs;

// Raised when the shape of a kept query changes, so an older copy is dropped rather than misread.
const buster = '1';

const keyOf = (serverId: string): string => `query-cache:${serverId}`;

const pageTreeKey = ['pluginPageTree'] as const;

// The Session list, every Feed and its snapshot, and the Plugin page trees: what a screen waits on before it can draw.
export function serverCache(serverId: string, trpc: TRPC): PersistOptions {
  const kept = [
    trpc.session.list.pathKey(),
    feedKeyPrefix,
    snapshotKeyPrefix,
    pageTreeKey,
  ];

  return {
    persister: createAsyncStoragePersister({
      storage: AsyncStorage,
      key: keyOf(serverId),
      throttleTime: writeEveryMs,
    }),
    maxAge: keptFor,
    buster,
    dehydrateOptions: {
      shouldDehydrateQuery: ({ state, queryKey }) =>
        state.status === 'success' &&
        kept.some((prefix) => partialMatchKey(queryKey, prefix)),
    },
  };
}

/*
 * Wipes everything kept for a Server: the Device was unpaired from it, or it was removed from the App. A write the
 * persister had already queued for it would put the copy back, so it is wiped again once that write has had its turn.
 */
export async function forgetServerCache(serverId: string): Promise<void> {
  await AsyncStorage.removeItem(keyOf(serverId));
  setTimeout(() => {
    void AsyncStorage.removeItem(keyOf(serverId));
  }, wipeAgainAfterMs);
}
