import { type LiveHeader, runningCompactionStatus } from '@repo/contracts';
import type { FeedActivity, FeedViewItem } from './feed-view';

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
  if (!liveHeader) return null;

  if (drawnAboveNewest(items, liveHeader)) return null;

  if (!isOpenWork(items.at(-1))) return liveHeader;

  return independentHeader(liveHeader);
}

/*
 * A Conversation steers its Prompt into the running Turn, so the person's words land below the
 * Tool call still running. That Tool call already draws itself there; the header would repeat it below.
 */
function drawnAboveNewest(
  items: readonly FeedViewItem[],
  { source }: LiveHeader,
): boolean {
  if (source.type !== 'tool_call') return false;

  return items
    .slice(0, -1)
    .some((item) => drawnToolCallIds(item).includes(source.toolCallId));
}

function drawnToolCallIds(item: FeedViewItem | FeedActivity): string[] {
  switch (item.type) {
    case 'tool_call':
      return [item.row.toolCallId];
    case 'exploration':
      return item.toolCalls.map(({ toolCallId }) => toolCallId);
    case 'group':
      return item.items.flatMap(drawnToolCallIds);
    default:
      return [];
  }
}

function independentHeader(liveHeader: LiveHeader): LiveHeader | null {
  return ['request', 'retry', 'thought'].includes(liveHeader.source.type)
    ? liveHeader
    : null;
}
