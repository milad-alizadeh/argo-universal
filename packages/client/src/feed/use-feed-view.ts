import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { useMemo, useRef } from 'react';
import type { FeedView } from './feed-view';
import { keepUnchangedItems } from './keep-unchanged-items';
import { toFeedView } from './to-feed-view';

// The Feed view, keeping each unchanged item's object so a streamed row redraws only its own item.
export function useFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
): FeedView | null {
  const previous = useRef<FeedView | null>(null);
  return useMemo(() => {
    if (!snapshot) return null;
    previous.current = keepUnchangedItems(
      previous.current,
      toFeedView(rows, snapshot),
    );
    return previous.current;
  }, [rows, snapshot]);
}
