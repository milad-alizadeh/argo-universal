import type {
  AgentThought,
  Notice,
  Plan,
  SessionUpdate,
  ToolCallUpdate,
  TurnEnd,
} from '@repo/contracts';

export interface FeedToolCall {
  type: 'tool_call';
  awaitingApproval?: boolean;
  row: ToolCallUpdate;
}

interface FeedThought {
  type: 'thought';
  row: AgentThought;
}

// How an Exploration draws its header; the state, never this title, tells whether it is open.
export const explorationTitle = (state: 'open' | 'settled'): string =>
  state === 'open' ? 'Exploring' : 'Explored';

export interface FeedExploration {
  type: 'exploration';
  id: string;
  // Open while any of its calls still runs.
  state: 'open' | 'settled';
  toolCalls: ToolCallUpdate[];
}

interface FeedNotice {
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

// One `subagent_update` action, drawn as a Feed row that opens the Subagent's Feed.
export interface FeedSubagent {
  type: 'subagent';
  id: string;
  subagentSessionId: string;
  kind: 'started' | 'messaged' | 'replied';
  // The Agent's name for the child.
  title: string;
  // Tints and names the row's avatar; Argo falls back to the General mark without one.
  role: string | null;
  // The first line of the prompt, the parent's message, or the child's reply.
  text?: string;
}

interface FeedStandaloneRow {
  type: 'row';
  row: Exclude<
    SessionUpdate,
    { sessionUpdate: 'tool_call_update' | 'agent_thought' | 'subagent_update' }
  >;
}

export interface FeedTurnEnd {
  type: 'turn_end';
  row: Notice;
  end: TurnEnd;
}

export type FeedViewItem =
  | FeedActivity
  | FeedGroup
  | FeedStandaloneRow
  | FeedSubagent
  | FeedTurnEnd;

// The active Plan sits above the Composer.
export interface FeedView {
  items: FeedViewItem[];
  plan: Plan | null;
}

// A group, an exploration and a Subagent row carry their own id; every other item is keyed by its row.
export const feedItemKey = (item: FeedViewItem): string =>
  'id' in item ? item.id : item.row.id;
