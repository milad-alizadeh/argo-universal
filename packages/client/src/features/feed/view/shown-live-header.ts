import type { LiveHeader } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';

function isLiveExploration(item: FeedViewItem | undefined): boolean {
  return item?.type === 'exploration' && item.state === 'open';
}

// A group takes the header as its title, so it never hides one; an open Exploration draws its own work.
export function shownLiveHeader(
  items: readonly FeedViewItem[],
  liveHeader: LiveHeader | null,
): LiveHeader | null {
  if (!liveHeader || !isLiveExploration(items.at(-1))) return liveHeader;

  return independentHeader(liveHeader);
}

function independentHeader(liveHeader: LiveHeader): LiveHeader | null {
  return ['request', 'retry', 'thought'].includes(liveHeader.source.type)
    ? liveHeader
    : null;
}
