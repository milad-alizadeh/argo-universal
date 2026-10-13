import type {
  LiveHeader as LiveHeaderValue,
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

// The drawn items, then the live header while it shows.
export function withLiveHeader(
  drawnItems: FeedViewItem[],
  liveHeader: LiveHeaderValue | null,
  toolCall: ToolCallUpdate | undefined,
): FeedEntry[] {
  const shown = shownLiveHeader(drawnItems, liveHeader);
  return shown
    ? [...drawnItems, { type: 'live_header', liveHeader: shown, toolCall }]
    : drawnItems;
}

export function newestKeyOf(drawnItems: readonly FeedViewItem[]): string {
  const newestItem = drawnItems.at(-1);
  return newestItem ? feedItemKey(newestItem) : '';
}

// Thoughts, tool calls and the live header: what the Agent does between messages.
const isActivity = (entry: FeedEntry): boolean => entry.type !== 'row';

const isAgentMessage = (entry: FeedEntry): boolean =>
  entry.type === 'row' && entry.row.sessionUpdate === 'agent_message';

type RhythmKind = 'activity' | 'agentMessage' | 'other';

function rhythmKind(entry: FeedEntry): RhythmKind {
  if (isActivity(entry)) return 'activity';
  return isAgentMessage(entry) ? 'agentMessage' : 'other';
}

// The space between two entries of the same kind; entries of different kinds take the `other` space.
const spaceBetween: Record<RhythmKind, string> = {
  activity: 'pb-2 wide:pb-1.5',
  agentMessage: 'pb-paragraph wide:pb-paragraph-wide',
  other: 'pb-6 wide:pb-5',
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
