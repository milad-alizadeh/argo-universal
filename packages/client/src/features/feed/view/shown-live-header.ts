import { type LiveHeader, runningCompactionStatus } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';

function isOpenWork(item: FeedViewItem | undefined): boolean {
  if (!item) return false;

  return namesItself.some((names) => names(item));
}

function isCompacting(item: FeedViewItem): boolean {
  return (
    item.type === 'row' &&
    item.row.sessionUpdate === 'compaction_update' &&
    item.row.status === runningCompactionStatus
  );
}

const namesItself = [isOpenGroup, isLiveExploration, isCompacting];

function isOpenGroup(item: FeedViewItem): boolean {
  return item.type === 'group' && item.state === 'open';
}

function isLiveExploration(item: FeedViewItem): boolean {
  return item.type === 'exploration' && item.state === 'open';
}

/*
 * Work that already names itself keeps its own title: an open group is titled by the Tool call
 * running in it, an open Exploration draws its own rows, and a running Compaction is its own line.
 * A settled group has only a counts summary, so it takes the header as its title and says what
 * the Session row says (#1410).
 */
export function shownLiveHeader(
  items: readonly FeedViewItem[],
  liveHeader: LiveHeader | null,
): LiveHeader | null {
  if (!liveHeader || !isOpenWork(items.at(-1))) return liveHeader;

  return independentHeader(liveHeader);
}

function independentHeader(liveHeader: LiveHeader): LiveHeader | null {
  return ['request', 'retry', 'thought'].includes(liveHeader.source.type)
    ? liveHeader
    : null;
}
