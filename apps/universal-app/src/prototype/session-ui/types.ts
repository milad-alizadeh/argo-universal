// PROTOTYPE: throwaway types for the universal Session UI prototype. Not the contracts.

export type AgentId = 'claude' | 'codex';
export type Tone = 'planning' | 'safe' | 'moderate' | 'dangerous';
export type SessionState = 'needs_input' | 'running' | 'failed' | 'idle';

export interface Mode {
  id: string;
  name: string;
  icon: string;
  tone: Tone;
  description: string;
}

export interface Model {
  id: string;
  name: string;
  efforts: string[];
  images: boolean;
}

export interface AgentCatalog {
  id: AgentId;
  name: string;
  installed: boolean;
  signedIn: boolean;
  modes: Mode[];
  models: Model[];
}

export type ToolKind =
  | 'read'
  | 'search'
  | 'list'
  | 'execute'
  | 'edit'
  | 'fetch'
  | 'other';

export interface ToolCall {
  type: 'tool';
  id: string;
  kind: ToolKind;
  status: 'running' | 'done' | 'failed';
  description?: string;
  path?: string;
  query?: string;
  command?: string;
  readOnly?: boolean;
  output?: string[];
  exitCode?: number;
  seconds?: number;
  diff?: { added: number; removed: number; created?: boolean; lines: string[] };
  server?: string;
  permission?: 'allowed' | 'denied';
}

export type FeedRow =
  | { type: 'user'; id: string; text: string; images?: number }
  | { type: 'message'; id: string; text: string }
  | { type: 'thought'; id: string; title: string; text: string; seconds?: number }
  | ToolCall
  | {
      type: 'subagent';
      id: string;
      name: string;
      state: 'running' | 'done';
      prompt: string;
      rows: FeedRow[];
    }
  | { type: 'compaction'; id: string; seconds?: number }
  | { type: 'notice'; id: string; level: 'error' | 'info'; text: string }
  | { type: 'request-outcome'; id: string; text: string }
  | { type: 'turn-end'; id: string; seconds: number; stopped?: boolean };

export type WorkState = 'running' | 'done' | 'failed';

// A Subagent the Session started; its id matches its Feed row.
export interface Subagent {
  id: string;
  name: string;
  state: WorkState;
  model: string;
  seconds: number;
  tokens: number;
  prompt: string;
  rows: FeedRow[];
}

// A command the Agent left running in the background.
export interface Shell {
  id: string;
  label?: string;
  command: string;
  state: WorkState;
  seconds: number;
  output: string[];
}

export interface PlanItem {
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export type Request =
  | {
      kind: 'permission';
      toolCallId: string;
      title: string;
      detail: string;
    }
  | {
      kind: 'elicitation';
      question: string;
      options: string[];
    }
  | { kind: 'plan'; title: string; steps: string[] };

export interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  added: number;
  removed: number;
  diff: string[];
}

export interface Session {
  id: string;
  project: string;
  title: string;
  agent: AgentId;
  state: SessionState;
  unread: boolean;
  archived: boolean;
  activity: string;
  updatedAt: string;
  mode: string;
  model: string;
  effort: string;
  checkout: 'worktree' | 'main';
  branch: string;
  contextUsed: number;
  feed: FeedRow[];
  plan: PlanItem[];
  request?: Request;
  changedFiles: ChangedFile[];
  subagents: Subagent[];
  shells: Shell[];
  turnStartedAt?: number;
  pendingSettings?: boolean;
}

export type TrackerKind = 'linear' | 'github';

export interface Project {
  name: string;
  // The Server's path to the git common directory; it is the Project's identity.
  path: string;
  repository: { host: 'GitHub' | 'GitLab'; slug: string } | null;
  tracker: { kind: TrackerKind; team?: string } | null;
}

// Shared status categories; rows show the tracker's own status name.
export type IssueCategory = 'triage' | 'backlog' | 'todo' | 'started' | 'done' | 'cancelled';

export interface Issue {
  id: string;
  number: string;
  project: string;
  title: string;
  status: string;
  category: IssueCategory;
  body: string;
  sessionIds: string[];
  cycle?: number;
  milestone?: string;
}

// A named list of Issues that a tracker Integration registers.
export interface IssueView {
  id: string;
  project: string | null;
  name: string;
  group?: string;
  detail?: string;
  match: (issue: Issue) => boolean;
}
