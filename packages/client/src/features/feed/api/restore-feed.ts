import type { SessionSnapshot } from '@repo/contracts';
import type { PersistedQuery } from '@tanstack/query-persist-client-core';
import {
  hashKey,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FeedState } from '../view/feed-state';
import { feedKey, snapshotKey } from './feed-query';

// Reads one query's copy off the Device by its hash, calling back with what it kept; the persister's own `retrieveQuery`.
type RetrieveKept = (
  queryHash: string,
  restored: (kept: PersistedQuery) => void,
) => Promise<FeedState | SessionSnapshot | undefined>;

// Where the Device's persister leaves its `retrieveQuery`, in the kept queries' default `meta`.
export const keptOnDevice = 'keptOnDevice';

const isRetrieve = (value: unknown): value is RetrieveKept =>
  typeof value === 'function';

function retrieveFor(
  queryClient: QueryClient,
  key: readonly unknown[],
): RetrieveKept | undefined {
  const retrieve = queryClient.getQueryDefaults(key).meta?.[keptOnDevice];

  return isRetrieve(retrieve) ? retrieve : undefined;
}

/*
 * A kept copy lands in the cache with the age it had on the Device, unless the cache already holds something. A copy
 * that cannot be read, because the storage fails or what it holds is corrupt, counts as nothing kept: the persister
 * has already removed a key it could not parse, and this settles either way.
 */
function restoreQuery(
  retrieve: RetrieveKept,
  queryClient: QueryClient,
  key: readonly unknown[],
): Promise<void> {
  return new Promise((done) => {
    retrieve(hashKey(key), (kept) => {
      if (queryClient.getQueryData(key) === undefined)
        queryClient.setQueryData(key, kept.state.data, {
          updatedAt: kept.state.dataUpdatedAt,
        });

      done();
    })
      .then((found) => {
        if (found === undefined) done();
      })
      .catch(() => done());
  });
}

/*
 * Puts a Session's Feed and snapshot, as the Device kept them, in the cache before its subscription opens, so the
 * subscription resumes after the revision stored rather than opening cold. Only the two queries of this Session are read.
 * True until that is done; false at once where nothing is kept on the Device, or the cache already holds the Feed.
 */
export function useRestoreFeed(cacheId: string, held: boolean): boolean {
  const queryClient = useQueryClient();
  const retrieve = retrieveFor(queryClient, feedKey(cacheId));
  const [restored, setRestored] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    if (retrieve && cacheId !== '' && !held)
      void Promise.all(
        [feedKey(cacheId), snapshotKey(cacheId)].map((key) =>
          restoreQuery(retrieve, queryClient, key),
        ),
      ).then(() => {
        if (live) setRestored(cacheId);
      });

    return (): void => {
      live = false;
    };
  }, [retrieve, queryClient, cacheId, held]);

  return (
    retrieve !== undefined && cacheId !== '' && !held && restored !== cacheId
  );
}
