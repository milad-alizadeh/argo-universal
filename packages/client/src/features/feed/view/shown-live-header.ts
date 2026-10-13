import type { LiveHeader } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';

function isOpenWork(item: FeedViewItem | undefined): boolean {
  if (!item) return false;

  return isOpenGroup(item) || isLiveExploration(item);
}

function isOpenGroup(item: FeedViewItem): boolean {
  return item.type === 'group' && item.state === 'open';
}

function isLiveExploration(item: FeedViewItem): boolean {
  return item.type === 'exploration' && item.title === 'Exploring';
}

export function shownLiveHeader(
  items: readonly FeedViewItem[],
  liveHeader: LiveHeader | null,
): LiveHeader | null {
  if (!liveHeader || !isOpenWork(items.at(-1))) return liveHeader;

  return waitingHeader(liveHeader);
}

function waitingHeader(liveHeader: LiveHeader): LiveHeader | null {
  return ['request', 'retry'].includes(liveHeader.source.type)
    ? liveHeader
    : null;
}
