import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type AsyncStorage as PersisterStorage,
  type PersistedQuery,
  experimental_createQueryPersister,
} from '@tanstack/query-persist-client-core';

/*
 * Where one Server's cache is kept on the Device (ADR-0045, amended 2026-11-24): TanStack's per-query persister over
 * the storage the App already uses, AsyncStorage on a phone and its localStorage on the web. Each query is a key of
 * its own under the Server's prefix, so one write is one query and a wipe is every key under the prefix.
 */
const hourMs = 3_600_000;

// The Feed and Plugin page trees are kept in memory for 24 hours, and the copy on the Device lives as long.
export const cacheMaxAge = 24 * hourMs;

// Raised when the shape of a kept query changes, so an older copy is dropped rather than misread.
const buster = '1';

// A Server's keys, whatever its id holds; the colon ends the id, so no Server's prefix starts another's.
const prefixOf = (serverId: string): string =>
  `query-cache:${encodeURIComponent(serverId)}:`;

// A Server this Device has unpaired from, or that was removed, takes no more writes until it is paired again.
const forgotten = new Set<string>();

type Entries = [key: string, value: string][];

async function entriesUnder(prefix: string): Promise<Entries> {
  try {
    return await readEntriesUnder(prefix);
  } catch {
    // Storage that cannot be read holds nothing the App can use.
    return [];
  }
}

async function readEntriesUnder(prefix: string): Promise<Entries> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(prefix),
  );

  const pairs = await AsyncStorage.multiGet(keys);

  return pairs.flatMap(([key, value]): Entries =>
    value === null ? [] : [[key, value]],
  );
}

// The Device's storage as one Server's persister reads it; once the Server is forgotten, a write that was still queued does nothing.
export function serverCacheStorage(serverId: string): PersisterStorage {
  const prefix = prefixOf(serverId);

  return {
    // Storage that cannot be read holds nothing the App can use; it is read as empty.
    getItem: async (key) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      if (!forgotten.has(serverId)) await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // A key that cannot be removed is read again, and dropped, next time.
      }
    },
    entries: () => entriesUnder(prefix),
  };
}

interface PersisterOptions {
  // The Device's own storage except where a story slows it down or breaks it.
  storage?: PersisterStorage;
  // How a query is written: the whole state, unless the caller trims it.
  serialize?: (kept: PersistedQuery) => string;
}

export function serverQueryPersister(
  serverId: string,
  { storage = serverCacheStorage(serverId), serialize }: PersisterOptions = {},
): ReturnType<typeof experimental_createQueryPersister> {
  return experimental_createQueryPersister({
    storage,
    serialize,
    prefix: prefixOf(serverId),
    maxAge: cacheMaxAge,
    buster,
  });
}

// A Server paired again is written to again.
export function rememberServerCache(serverId: string): void {
  forgotten.delete(serverId);
}

// Wipes everything kept for a Server: the Device was unpaired from it, or it was removed from the App.
export async function forgetServerCache(serverId: string): Promise<void> {
  forgotten.add(serverId);
  await serverQueryPersister(serverId).removeQueries();
}
