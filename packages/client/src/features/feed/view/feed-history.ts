import type { FeedPageOutput } from '@repo/contracts';
import { type FeedState, mergeNewestPage } from './feed-state';

export type HistoryWindow = Pick<FeedState, 'epoch' | 'startCursor'>;

function overlapsHistory(page: HistoryWindow, window: HistoryWindow): boolean {
  if (page.epoch !== window.epoch) return false;
  return overlapsCursor(page.startCursor, window.startCursor);
}

function overlapsCursor(cursor: number | null, start: number | null): boolean {
  if (cursor === null || start === null) return false;
  return cursor >= start;
}

export function needsOlderHistory(
  page: Pick<FeedPageOutput, 'epoch' | 'hasOlder' | 'startCursor'> | undefined,
  window: HistoryWindow,
): boolean {
  if (!page) return false;
  return page.hasOlder && overlapsHistory(page, window);
}

function mergeCurrentHistory(
  feed: FeedState,
  pages: readonly FeedPageOutput[],
  hasOlder: boolean,
): FeedState {
  const tail = pages[0];
  if (!tail) return feed;
  return {
    ...mergeNewestPage(feed, {
      ...tail,
      rows: pages.flatMap((page) => page.rows),
    }),
    hasOlder,
  };
}

function staleHistory(feed: FeedState, page: FeedPageOutput): boolean {
  return feed.epoch !== null && page.epoch < feed.epoch;
}

export function mergeHistoryPages(
  feed: FeedState,
  pages: readonly FeedPageOutput[],
): FeedState {
  const oldest = pages.at(-1);
  if (!oldest) return feed;
  if (staleHistory(feed, oldest)) return feed;
  const current = pages.filter((page) => page.epoch === oldest.epoch);
  return mergeCurrentHistory(feed, current, oldest.hasOlder);
}
