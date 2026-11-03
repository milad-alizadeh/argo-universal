import type { SessionUpdate } from '@repo/contracts';
import type { FeedView } from '../../view/feed-view';
import { keepUnchangedItems } from '../../view/keep-unchanged-items';
import { toFeedView } from '../../view/to-feed-view';
import { longSnapshot } from './feed.mocks';

export interface HeldFeed {
  start: number;
  arrived: readonly SessionUpdate[];
  view: FeedView;
}

export function viewOf(
  previous: FeedView | null,
  rows: readonly SessionUpdate[],
  held: Omit<HeldFeed, 'view'>,
): HeldFeed {
  return {
    ...held,
    view: keepUnchangedItems(
      previous,
      toFeedView([...rows.slice(held.start), ...held.arrived], longSnapshot),
    ),
  };
}
