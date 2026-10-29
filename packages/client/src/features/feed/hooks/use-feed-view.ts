import type { SessionSnapshot } from '@repo/contracts';
import { useState } from 'react';
import type { FeedState } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import { toFeedView } from '../view/to-feed-view';

export function useFeedView(
  sessionId: string | undefined,
  feed: FeedState,
  options: { snapshot: SessionSnapshot | null; convert?: typeof toFeedView },
): FeedView | null {
  return useHeldView({
    sessionId,
    rows: feed.rows,
    snapshot: options.snapshot,
    convert: options.convert ?? toFeedView,
  });
}

function useHeldView(
  input: ViewInput & { convert: typeof toFeedView },
): FeedView | null {
  const [held, setHeld] = useState(() => initialView(input));

  if (!changed(held, input)) return held.view;

  const view = nextView(held, input);
  setHeld({
    sessionId: input.sessionId,
    rows: input.rows,
    snapshot: input.snapshot,
    view,
  });

  return view;
}

type HeldView = {
  sessionId: string | undefined;
  rows: FeedState['rows'];
  snapshot: SessionSnapshot | null;
  view: FeedView | null;
};

type ViewInput = Pick<HeldView, 'sessionId' | 'rows' | 'snapshot'>;

function changed(held: HeldView, next: ViewInput): boolean {
  return (
    held.sessionId !== next.sessionId ||
    held.rows !== next.rows ||
    held.snapshot !== next.snapshot
  );
}

function nextView(
  held: HeldView,
  next: ViewInput & { convert: typeof toFeedView },
): FeedView | null {
  if (!next.snapshot) return null;

  const previous = held.sessionId === next.sessionId ? held.view : null;

  return keepUnchangedItems(previous, next.convert(next.rows, next.snapshot));
}

function initialView(
  input: ViewInput & { convert: typeof toFeedView },
): HeldView {
  const { sessionId, rows, snapshot, convert } = input;

  return {
    sessionId,
    rows,
    snapshot,
    view: snapshot ? convert(rows, snapshot) : null,
  };
}
