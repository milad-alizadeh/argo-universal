import type { FeedViewItem } from './feed-view';

export type FeedRow = Extract<FeedViewItem, { type: 'row' }>['row'];

type MessageRow = Extract<
  FeedRow,
  { sessionUpdate: 'user_message' | 'prompt_message' | 'agent_message' }
>;

const messageRows = new Set<string>([
  'user_message',
  'prompt_message',
  'agent_message',
]);

// Whether a row is a message the Feed draws with its content: the user's, a Prompt's or the Agent's.
export const isMessage = (row: FeedRow): row is MessageRow =>
  messageRows.has(row.sessionUpdate);
