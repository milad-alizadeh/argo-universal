import type { SessionSnapshot } from '@repo/contracts';
import { useState } from 'react';
import type { FeedState } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import { toFeedView } from '../view/to-feed-view';

export function useFeedView(
  sessionId: string | undefined,
  feed: FeedState,
  snapshot: SessionSnapshot | null,
): FeedView | null {
  const [held, setHeld] = useState(() => ({
    sessionId,
    rows: feed.rows,
    snapshot,
    view: snapshot ? toFeedView(feed.rows, snapshot) : null,
  }));

  let view = held.view;

  if (
    held.sessionId !== sessionId ||
    held.rows !== feed.rows ||
    held.snapshot !== snapshot
  ) {
    const previous = held.sessionId === sessionId ? held.view : null;
    view = snapshot
      ? keepUnchangedItems(previous, toFeedView(feed.rows, snapshot))
      : null;
    setHeld({ sessionId, rows: feed.rows, snapshot, view });
  }

  return view;
}
