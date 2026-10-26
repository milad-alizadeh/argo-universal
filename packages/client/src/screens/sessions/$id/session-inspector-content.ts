import type { ChangesViewProps } from '#features/changes';
import type {
  SessionHeaderProps,
  ShellPanelProps,
  SubagentListProps,
} from '#features/sessions';
import type { AgentFeedSlot } from './session-agents-tab';

// What a Session gives its Sections to draw from.
export interface SessionInspectorContent {
  header?: SessionHeaderProps;
  renderSubagentFeed?: AgentFeedSlot;
  subagents?: SubagentListProps;
  shells?: ShellPanelProps;
  // The Session's changed files; absent until the page loads them.
  changes?: ChangesViewProps;
}
