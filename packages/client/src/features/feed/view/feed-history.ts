import type { FeedPageOutput } from '@repo/contracts';
import { type FeedState, mergeNewestPage } from './feed-state';

export function mergeHistoryPages(
  feed: FeedState,
  pages: readonly FeedPageOutput[],
): FeedState {
  const oldest = pages.at(-1);
  if (!oldest || (feed.epoch !== null && oldest.epoch < feed.epoch))
    return feed;
  const current = pages.filter((page) => page.epoch === oldest.epoch);
  const tail = current[0];
  if (!tail) return feed;
  return {
    ...mergeNewestPage(feed, {
      ...tail,
      rows: current.flatMap((page) => page.rows),
    }),
    hasOlder: oldest.hasOlder,
  };
}
