import type { FeedPageOutput } from '@repo/contracts';
import { useEffect } from 'react';
import type { FeedCache } from '../api/feed-cache';

// History pages that are not the Session's own tail, merged into its window as they load.
export function useFeedHistoryPages(
  cache: FeedCache,
  data: { pages: readonly FeedPageOutput[] } | undefined,
): void {
  useEffect(() => {
    if (data) cache.mergeHistory(data.pages);
  }, [cache, data]);
}
