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
}

export type FeedEntry = FeedViewItem | LiveHeaderEntry;

export const entryType = (
  entry: FeedEntry,
):
  | Exclude<FeedEntry['type'], 'row'>
  | Extract<FeedEntry, { type: 'row' }>['row']['sessionUpdate'] =>
  entry.type === 'row' ? entry.row.sessionUpdate : entry.type;

const liveHeaderKey = 'live-header';

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
  const lastTurnItem = drawnItems.findLastIndex(
    ({ type }) => type !== 'delegated',
  );

  const turnItems =
    lastTurnItem === drawnItems.length - 1
      ? drawnItems
      : drawnItems.slice(0, lastTurnItem + 1);
  const delegated = drawnItems.slice(lastTurnItem + 1);
  const shown = shownLiveHeader(turnItems, liveHeader);

  if (!shown) return drawnItems;

  const group = newestGroup(turnItems.at(-1), shown.source.type);

  if (group)
    return [
      ...turnItems.slice(0, -1),
      { ...group, liveHeader: shown },
      ...delegated,
    ];

  return [
    ...turnItems,
    { type: 'live_header', liveHeader: shown, toolCall },
    ...delegated,
  ];
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
  !next || next.type === 'live_header' || next.type === 'delegated';

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

const promptGap = 'pb-6 wide-type:pb-5';

const activityMessageGap = 'pb-4 wide-type:pb-3';

const spaceBetween: Record<RhythmKind, Record<RhythmKind, string>> = {
  activity: {
    activity: 'pb-2 wide-type:pb-1.5',
    agentMessage: activityMessageGap,
    other: promptGap,
  },
  agentMessage: {
    activity: activityMessageGap,
    agentMessage: 'pb-paragraph wide-type:pb-paragraph-wide',
    other: promptGap,
  },
  other: { activity: promptGap, agentMessage: promptGap, other: promptGap },
};

// The Feed's rhythm, set below a row by the row after it, so older rows paging in above never resize a row the reader sees.
export function spaceBelowEntry(
  entry: FeedEntry,
  next: FeedEntry | undefined,
): string {
  return next ? spaceBetween[rhythmKind(entry)][rhythmKind(next)] : '';
}
