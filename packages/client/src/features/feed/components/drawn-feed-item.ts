import type { ContentBlock } from '@repo/contracts';
import type { FeedViewItem } from '../view/feed-view';
import { turnEndNotice } from './turn-end/turn-end-notice';

// Items the Feed draws whatever they hold; a row draws by its update (`drawsRow`).
const drawnItemTypes: Record<
  Exclude<FeedViewItem['type'], 'row' | 'turn_end'>,
  boolean
> = {
  group: true,
  exploration: true,
  subagent: true,
  tool_call: true,
  thought: false,
};

const drawnRows = new Set<string>(['notice', 'compaction_update']);

const messageRows = new Set<string>(['user_message', 'agent_message']);

const isBlankText = (block: ContentBlock): boolean =>
  block.type === 'text' && block.text.trim() === '';

type FeedRow = Extract<FeedViewItem, { type: 'row' }>['row'];

/*
 * A message of nothing but blank text draws nothing, and the Feed's space sits between what is
 * drawn, so it is left out rather than leaving a gap. One still streaming draws its caret.
 */
const drawsMessage = (row: Extract<FeedRow, { content: unknown }>): boolean =>
  row.state === 'open' || row.content.some((block) => !isBlankText(block));

const isMessage = (
  row: FeedRow,
): row is Extract<
  FeedRow,
  { sessionUpdate: 'user_message' | 'agent_message' }
> => messageRows.has(row.sessionUpdate);

// A row draws by its update: a Notice and a Compaction always, a message when it holds anything to see.
const drawsRow = (row: FeedRow): boolean =>
  isMessage(row) ? drawsMessage(row) : drawnRows.has(row.sessionUpdate);

// Whether the Feed draws anything for an item yet.
export function isDrawnFeedItem(item: FeedViewItem): boolean {
  if (item.type === 'row') return drawsRow(item.row);

  if (item.type === 'turn_end') return turnEndNotice(item.end) !== null;

  return drawnItemTypes[item.type];
}
