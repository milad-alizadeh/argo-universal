import type { ChangesViewProps } from '#features/changes';
import type {
  SessionHeaderProps,
  ShellPanelProps,
  SubagentListProps,
} from '#features/sessions';
import type { AgentFeedSlot } from './session-agents-tab';

// The Subagent whose Feed the Session has open, and the way back to its list.
export interface OpenSubagentFeed {
  sessionId: string;
  onBack: () => void;
}

// What a Session gives its Sections to draw from.
export interface SessionInspectorContent {
  header?: SessionHeaderProps;
  renderSubagentFeed?: AgentFeedSlot;
  subagents?: SubagentListProps;
  // Set while a Subagent's Feed is open over the Agents list.
  openSubagentFeed?: OpenSubagentFeed;
  shells?: ShellPanelProps;
  // The Session's changed files; absent until the page loads them.
  changes?: ChangesViewProps;
}
