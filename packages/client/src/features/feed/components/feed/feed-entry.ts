import type {
  LiveHeader as LiveHeaderValue,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { type FeedViewItem, feedItemKey } from '../../view/feed-view';
import { shownLiveHeader } from '../../view/shown-live-header';

// The live header is the list's last row, so the list measures it and follows it like any row.
export type FeedEntry =
  | FeedViewItem
  | {
      type: 'live_header';
      liveHeader: LiveHeaderValue;
      toolCall?: ToolCallUpdate;
    };

export const entryType = (
  entry: FeedEntry,
):
  | Exclude<FeedEntry['type'], 'row'>
  | Extract<FeedEntry, { type: 'row' }>['row']['sessionUpdate'] =>
  entry.type === 'row' ? entry.row.sessionUpdate : entry.type;

export const entryKey = (entry: FeedEntry): string =>
  entry.type === 'live_header' ? 'live-header' : feedItemKey(entry);

const isOpenGroup = (
  item: FeedViewItem | undefined,
): item is Extract<FeedViewItem, { type: 'group'; state: 'open' }> =>
  item?.type === 'group' && item.state === 'open';

// The drawn items, then the live header while it shows; an open group last takes it as its title.
export function withLiveHeader(
  drawnItems: FeedViewItem[],
  liveHeader: LiveHeaderValue | null,
  toolCall?: ToolCallUpdate,
): FeedEntry[] {
  const shown = shownLiveHeader(drawnItems, liveHeader);
  const newest = drawnItems.at(-1);

  if (!shown) return drawnItems;

  if (isOpenGroup(newest))
    return [...drawnItems.slice(0, -1), { ...newest, liveHeader: shown }];

  return [...drawnItems, { type: 'live_header', liveHeader: shown, toolCall }];
}

export function newestKeyOf(drawnItems: readonly FeedViewItem[]): string {
  const newestItem = drawnItems.at(-1);

  return newestItem ? feedItemKey(newestItem) : '';
}

/*
 * Thoughts, Tool calls, the live header, and the status row a Notice or a Compaction draws:
 * what the Agent does between messages. A status row standing on its own reports on the work
 * beside it, as it does inside a group, so it keeps the activity rhythm rather than the space
 * that separates one message from the next.
 */
const isActivity = (entry: FeedEntry): boolean =>
  entry.type !== 'row' || isStatusRow(entry.row);

const isStatusRow = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' || row.sessionUpdate === 'compaction_update';

const isAgentMessage = (entry: FeedEntry): boolean =>
  entry.type === 'row' && entry.row.sessionUpdate === 'agent_message';

type RhythmKind = 'activity' | 'agentMessage' | 'other';

function rhythmKind(entry: FeedEntry): RhythmKind {
  if (isActivity(entry)) return 'activity';

  return isAgentMessage(entry) ? 'agentMessage' : 'other';
}

/*
 * The space between two entries of the same kind; entries of different kinds take
 * the `other` space. One breakpoint for all three: the rhythm steps down where the
 * type does (`wide-type:`), not where the window happens to get wide.
 */
const spaceBetween: Record<RhythmKind, string> = {
  activity: 'pb-2 wide-type:pb-1.5',
  agentMessage: 'pb-paragraph wide-type:pb-paragraph-wide',
  other: 'pb-6 wide-type:pb-5',
};

// The Feed's rhythm, set below a row by the row after it, so older rows paging in above never resize a row the reader sees.
export function spaceBelowEntry(
  entry: FeedEntry,
  next: FeedEntry | undefined,
): string {
  if (!next) return '';
  const kind = rhythmKind(entry);

  return kind === rhythmKind(next) ? spaceBetween[kind] : spaceBetween.other;
}
