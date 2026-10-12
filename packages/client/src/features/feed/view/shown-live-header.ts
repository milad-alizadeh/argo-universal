import type { LiveHeader } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';

const isOpenWork = (item: FeedViewItem | undefined): boolean =>
  (item?.type === 'group' && item.state === 'open') ||
  (item?.type === 'exploration' && item.title === 'Exploring');

// An open group already draws the running work, so the live header shows only what waits on you or a retry.
export function shownLiveHeader(
  items: readonly FeedViewItem[],
  liveHeader: LiveHeader | null,
): LiveHeader | null {
  if (!liveHeader || !isOpenWork(items.at(-1))) return liveHeader;
  const { type } = liveHeader.source;
  return type === 'request' || type === 'retry' ? liveHeader : null;
}
