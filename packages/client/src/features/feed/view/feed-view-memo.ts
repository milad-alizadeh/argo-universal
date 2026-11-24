import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { FeedState } from './feed-state';
import type { FeedView } from './feed-view';
import { shownRows } from './held-plan';
import { keepUnchangedItems } from './keep-unchanged-items';

type Translate = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
) => FeedView;

type FeedViewMemo = (
  feed: Pick<FeedState, 'rows' | 'plan'>,
  snapshot: SessionSnapshot | null,
  translate: Translate,
) => FeedView | null;

// The view is translated again only when its rows, Plan or snapshot changed (not its revision), and keeps the items that did not change.
export function createFeedViewMemo(): FeedViewMemo {
  let inputs: unknown[] = [];
  let view: FeedView | null = null;

  return ({ rows, plan }, snapshot, translate) => {
    const next = [rows, plan, snapshot, translate];

    if (next.every((input, at) => input === inputs[at])) return view;

    inputs = next;
    view = snapshot
      ? keepUnchangedItems(view, translate(shownRows({ rows, plan }), snapshot))
      : null;

    return view;
  };
}
