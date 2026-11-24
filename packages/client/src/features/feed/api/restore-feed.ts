import type { SessionSnapshot } from '@repo/contracts';
import type { PersistedQuery } from '@tanstack/query-persist-client-core';
import {
  hashKey,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import type { FeedState } from '../view/feed-state';
import { feedKey, snapshotKey } from './feed-query';

// Reads one query's copy off the Device by its hash, calling back with what it kept; the persister's own `retrieveQuery`. Not given where the Device keeps nothing.
export type RetrieveKept = (
  queryHash: string,
  restored: (kept: PersistedQuery) => void,
) => Promise<FeedState | SessionSnapshot | undefined>;

export const DeviceFeedContext = createContext<RetrieveKept | undefined>(
  undefined,
);

// A kept copy lands in the cache with the age it had on the Device, unless the cache already holds something.
function restoreQuery(
  retrieve: RetrieveKept,
  queryClient: QueryClient,
  key: readonly unknown[],
): Promise<void> {
  return new Promise((done) => {
    void retrieve(hashKey(key), (kept) => {
      if (queryClient.getQueryData(key) === undefined)
        queryClient.setQueryData(key, kept.state.data, {
          updatedAt: kept.state.dataUpdatedAt,
        });

      done();
    }).then((found) => {
      if (found === undefined) done();
    });
  });
}

/*
 * Puts a Session's Feed and snapshot, as the Device kept them, in the cache before its subscription opens, so the
 * subscription resumes after the revision stored rather than opening cold. Only the two queries of this Session are read.
 * True until that is done; false at once where nothing is kept on the Device, or the cache already holds the Feed.
 */
export function useRestoreFeed(cacheId: string, held: boolean): boolean {
  const retrieve = useContext(DeviceFeedContext);
  const queryClient = useQueryClient();
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
