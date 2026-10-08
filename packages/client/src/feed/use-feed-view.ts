import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { useState } from 'react';
import type { FeedView } from './feed-view';
import { keepUnchangedItems } from './keep-unchanged-items';
import { toFeedView } from './to-feed-view';

// The Feed view, keeping each unchanged item's object so a streamed row redraws only its own item.
export function useFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
): FeedView | null {
  const [held, setHeld] = useState({
    rows,
    snapshot,
    view: snapshot ? toFeedView(rows, snapshot) : null,
  });
  if (held.rows === rows && held.snapshot === snapshot) return held.view;
  const view = snapshot
    ? keepUnchangedItems(held.view, toFeedView(rows, snapshot))
    : null;
  setHeld({ rows, snapshot, view });
  return view;
}
