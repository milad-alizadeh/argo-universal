import type {
  LiveHeader as LiveHeaderValue,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import {
  type FeedActivity,
  type FeedGroup,
  type FeedViewItem,
  feedItemKey,
} from '../../view/feed-view';
import { groupTitle } from '../../view/group-title';
import { shownLiveHeader } from '../../view/shown-live-header';

// The live header is the list's last row, so the list measures it and follows it like any row.
export interface LiveHeaderEntry {
  type: 'live_header';
  liveHeader: LiveHeaderValue;
  toolCall?: ToolCallUpdate;
  closing?: boolean;
  onExit?: () => void;
}

export type FeedEntry = FeedViewItem | LiveHeaderEntry;

export const entryType = (
  entry: FeedEntry,
):
  | Exclude<FeedEntry['type'], 'row'>
  | Extract<FeedEntry, { type: 'row' }>['row']['sessionUpdate'] =>
  entry.type === 'row' ? entry.row.sessionUpdate : entry.type;

export const liveHeaderKey = 'live-header';

export const entryKey = (entry: FeedEntry): string =>
  entry.type === 'live_header' ? liveHeaderKey : feedItemKey(entry);

export const liveHeaderEntry = (
  entry?: FeedEntry,
): LiveHeaderEntry | undefined =>
  entry?.type === 'live_header' ? entry : undefined;

const isGroup = (
  item: FeedViewItem | undefined,
): item is Extract<FeedViewItem, { type: 'group' }> => item?.type === 'group';

type ToolWork = Extract<FeedActivity, { type: 'tool_call' | 'exploration' }>;

// A lone Tool call, or a settled Exploration; an open one draws its own live rows.
function isToolWork(item: FeedViewItem): item is ToolWork {
  if (item.type === 'exploration') return item.state === 'settled';

  return item.type === 'tool_call';
}

const workCalls = (item: ToolWork): ToolCallUpdate[] =>
  item.type === 'exploration' ? item.toolCalls : [item.row];

// A lone Tool call the Turn moved past joins the live header's group, keyed as the group the next call would open.
const workGroup = (item: ToolWork): FeedGroup => ({
  type: 'group',
  id: feedItemKey(item),
  title: groupTitle(workCalls(item)),
  state: 'settled',
  items: [item],
});

// A request, a retry and a thought stand on their own; only the Turn's work joins the Tool call before it.
type SourceType = LiveHeaderValue['source']['type'];

const joinsWork = (source: SourceType): boolean =>
  ['working', 'tool_call'].includes(source);

function wrappedWork(
  item: FeedViewItem,
  source: SourceType,
): FeedGroup | undefined {
  return isToolWork(item) && joinsWork(source) ? workGroup(item) : undefined;
}

function newestGroup(
  newest: FeedViewItem | undefined,
  source: SourceType,
): FeedGroup | undefined {
  if (!newest) return undefined;

  return isGroup(newest) ? newest : wrappedWork(newest, source);
}

/*
 * The drawn items, then the live header while it shows. A group last takes it as its title, and so
 * does a lone Tool call while the Agent works, wrapped in a group of its own: the Turn's work reads
 * as one row, and the Feed and the Session row say one line.
 */
export function withLiveHeader(
  drawnItems: FeedViewItem[],
  liveHeader: LiveHeaderValue | null,
  toolCall?: ToolCallUpdate,
): FeedEntry[] {
  const shown = shownLiveHeader(drawnItems, liveHeader);

  if (!shown) return drawnItems;
  const group = newestGroup(drawnItems.at(-1), shown.source.type);

  if (group)
    return [...drawnItems.slice(0, -1), { ...group, liveHeader: shown }];

  return [...drawnItems, { type: 'live_header', liveHeader: shown, toolCall }];
}

/*
 * Every message of a running Turn stays open until the Turn ends (ADR-0024), but the Agent writes
 * only at the Feed's end: a message with anything but the live header after it is finished, so it
 * draws no caret.
 */
export const isStreamingEntry = (entry: FeedEntry, next?: FeedEntry): boolean =>
  isOpenAgentMessage(entry) && endsFeed(next);

const isOpenAgentMessage = (entry: FeedEntry): boolean =>
  isAgentMessage(entry) && entry.row.state === 'open';

const endsFeed = (next?: FeedEntry): boolean =>
  !next || next.type === 'live_header';

export function newestKeyOf(drawnItems: readonly FeedViewItem[]): string {
  const newestItem = drawnItems.at(-1);

  return newestItem ? feedItemKey(newestItem) : '';
}

/*
 * What the Agent does between messages. A Notice or a Compaction reports on the work beside it,
 * and a group already draws it among its Tool calls, so it keeps the activity rhythm standing on
 * its own rather than the space that separates one message from the next.
 */
const isActivity = (entry: FeedEntry): boolean =>
  entry.type !== 'row' || drawsNotice(entry.row);

const drawsNotice = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' || row.sessionUpdate === 'compaction_update';

const isAgentMessage = (
  entry: FeedEntry,
): entry is Extract<FeedEntry, { type: 'row' }> =>
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
