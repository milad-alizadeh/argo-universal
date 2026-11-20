import type { ContentBlock } from '@repo/contracts';
import { type FeedEntry, entryKey, entryType } from './feed-entry';

export interface FeedRowData {
  entry: FeedEntry;
  spaceBelow: string;
  spaceBefore?: string;
  streaming: boolean;
}

const emptyTextBlock = (block: ContentBlock): boolean =>
  block.type === 'text' && block.text === '';

const emptyContent = (content: readonly ContentBlock[]): boolean =>
  content.length <= 1 && content.every(emptyTextBlock);

function emptyAnswer(entry: FeedEntry): boolean {
  if (entry.type !== 'row') return false;

  return (
    entry.row.sessionUpdate === 'agent_message' &&
    emptyContent(entry.row.content)
  );
}

// A streaming answer has no trailing gap. Its opening event can arrive before the first token.
export function emptyMessageSize(row: FeedRowData): number | undefined {
  return row.streaming && emptyAnswer(row.entry) ? 0 : undefined;
}

export const rowKey = (row: FeedRowData): string => entryKey(row.entry);

export const rowType = (row: FeedRowData): ReturnType<typeof entryType> =>
  entryType(row.entry);

// A prompt at the end has no trailing padding and measures shorter.
const promptType = (
  type: ReturnType<typeof rowType>,
  spaceBelow: string,
): string =>
  type === 'user_message' && !spaceBelow ? 'trailing_user_message' : type;

const activeGroup = (entry: FeedEntry): boolean =>
  entry.type === 'group' && (entry.state === 'open' || !!entry.liveHeader);

// The first Tool group takes the Working line's place with the same leading gap.
const showsActivityTitle = ({ entry, spaceBelow }: FeedRowData): boolean =>
  entry.type === 'live_header' || (!spaceBelow && activeGroup(entry));

export const androidRowType = (row: FeedRowData): string =>
  showsActivityTitle(row)
    ? 'activity_title'
    : promptType(rowType(row), row.spaceBelow);
