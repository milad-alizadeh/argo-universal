import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import {
  FeedCache,
  feedQueryDefaults,
} from '../../src/features/feed/api/feed-cache';
import { waitForFrame } from '../../src/features/feed/hooks/frame-wait';
import { createQueryClient } from '../../src/query-cache';
import { page } from '../feed-state.mocks';

// A Feed cache whose frames are the screen's own, and whose pages and rows are empty.
export const newFeedCache = (): FeedCache =>
  new FeedCache(createQueryClient(), 'session-1', {
    frame: waitForFrame,
    fetchPage: () => Promise.resolve(page([], 0)),
    fetchRow: () => Promise.reject(new Error('No row to fetch')),
  });

// What a screen shows of the Session: it renders when the Feed's queries change.
function SessionFeedScreen({ cache }: { cache: FeedCache }): JSX.Element {
  const feed = useQuery({ ...cache.tailOptions(), ...feedQueryDefaults });

  const held = useQuery({
    ...feedQueryDefaults,
    queryKey: cache.snapshotKey,
    enabled: false,
  });

  return (
    <span>{`${feed.data?.rows.length ?? 0} rows ${held.data ? 'ready' : ''}`}</span>
  );
}

// One cache per visit of a story, made new by each render so a repeat starts from nothing; `onCache` hands it to the story's play function.
export function FeedCacheScreen({
  onCache,
}: {
  onCache: (cache: FeedCache) => void;
}): JSX.Element {
  const [cache] = useState(newFeedCache);
  useEffect(() => onCache(cache), [cache, onCache]);

  return (
    <QueryClientProvider client={cache.queryClient}>
      <SessionFeedScreen cache={cache} />
    </QueryClientProvider>
  );
}
