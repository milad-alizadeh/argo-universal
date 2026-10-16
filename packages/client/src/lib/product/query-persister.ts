import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  type DehydrateOptions,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

type PersistOptions = PersistQueryClientProviderProps['persistOptions'];

// A persisted cache written under another version is dropped; raise it when a persisted query's shape changes.
const cacheVersion = '1';

// Only the named query outlives the App; every other query and every paused mutation, with what the reader typed, starts fresh.
export const persistOnly = (queryKey: string): DehydrateOptions => ({
  shouldDehydrateQuery: (query) =>
    query.queryKey[0] === queryKey && defaultShouldDehydrateQuery(query),
  shouldDehydrateMutation: () => false,
});

// The persisted cache over this Device's AsyncStorage, kept until a newer write replaces it.
export const queryPersistOptions = (queryKey: string): PersistOptions => ({
  persister: createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'query-cache',
  }),
  maxAge: Infinity,
  buster: cacheVersion,
  dehydrateOptions: persistOnly(queryKey),
});
