import type {
  AgentThought,
  Notice,
  Plan,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

export interface FeedToolCall {
  type: 'tool_call';
  awaitingApproval?: boolean;
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

export type FeedGroup = {
  type: 'group';
  id: string;
  title: string;
  items: FeedActivity[];
} & (
  | { state: 'settled' }
  | {
      state: 'open';
      live?: { toolCall: ToolCallUpdate; awaitingApproval: boolean };
    }
);

export interface FeedStandaloneRow {
  type: 'row';
  row: Exclude<
    SessionUpdate,
    { sessionUpdate: 'tool_call_update' | 'agent_thought' }
  >;
}

export type FeedViewItem = FeedActivity | FeedGroup | FeedStandaloneRow;

// The active Plan sits above the Composer.
export interface FeedView {
  items: FeedViewItem[];
  plan: Plan | null;
}

export const feedItemKey = (item: FeedViewItem): string =>
  item.type === 'group' || item.type === 'exploration' ? item.id : item.row.id;
