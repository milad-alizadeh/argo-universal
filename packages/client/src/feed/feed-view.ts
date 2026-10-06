import type {
  AgentThought,
  Notice,
  Plan,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

export interface FeedToolCall {
  type: 'tool_call';
  row: ToolCallUpdate;
}

export interface FeedThought {
  type: 'thought';
  row: AgentThought;
}

export interface FeedExploration {
  type: 'exploration';
  id: string;
  title: 'Exploring' | 'Explored';
  lines: string[];
  toolCalls: ToolCallUpdate[];
}

export interface FeedNotice {
  type: 'row';
  row: Notice;
}

export type FeedActivity =
  | FeedToolCall
  | FeedThought
  | FeedExploration
  | FeedNotice;

export interface FeedGroup {
  type: 'group';
  id: string;
  title: string;
  state: 'open' | 'settled';
  items: FeedActivity[];
}

export interface FeedStandaloneRow {
  type: 'row';
  row: Exclude<
    SessionUpdate,
    { sessionUpdate: 'tool_call_update' | 'agent_thought' | 'plan_update' }
  >;
}

export type FeedViewItem = FeedActivity | FeedGroup | FeedStandaloneRow;

// `toFeedView(rows, snapshot)` returns this shape; Plans sit outside the Feed flow.
export interface FeedView {
  items: FeedViewItem[];
  plan: Plan | null;
}

export const feedItemKey = (item: FeedViewItem) =>
  item.type === 'group' || item.type === 'exploration' ? item.id : item.row.id;
