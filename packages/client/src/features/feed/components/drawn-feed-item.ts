import type { FeedViewItem } from '../view/feed-view';
import { turnEndNotice } from './turn-end/turn-end';

// Items the Feed draws whatever they hold; a row draws when `drawnRows` holds its update.
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

const drawnRows = new Set<string>([
  'user_message',
  'agent_message',
  'notice',
  'compaction_update',
]);

// Whether the Feed draws anything for an item yet.
export function isDrawnFeedItem(item: FeedViewItem): boolean {
  if (item.type === 'row') return drawnRows.has(item.row.sessionUpdate);

  if (item.type === 'turn_end') return turnEndNotice(item.end) !== null;

  return drawnItemTypes[item.type];
}
