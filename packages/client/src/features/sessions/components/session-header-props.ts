import type { ChangesSummary, SessionStatus } from '@repo/contracts';
import type { MergeMethod } from '../stores/merge-method';
import type { SessionPanel } from '../stores/session-panels';
import type { SessionMenu } from './session-menu-items';
import type { SessionPullRequest } from './session-pull-request';
import type { SubagentListProps } from './subagent-list/subagent-list-types';

export type SessionHeaderStatus = Extract<
  SessionStatus,
  'running' | 'needs_input' | 'idle'
>;

export interface SessionChanges {
  summary?: ChangesSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The Inspector panels the header's triggers open: those the Session has, the one shown, and pressing a trigger.
export interface SessionHeaderPanels {
  pullRequests?: readonly SessionPullRequest[];
  onOpenChanges?: () => void;
  agents?: SubagentListProps;
  checks?: NonNullable<SessionPullRequest['checks']>;
  counts?: Partial<Record<SessionPanel, number>>;
  onSelect?: (panel: SessionPanel) => void;
  offered: readonly SessionPanel[];
  shown?: SessionPanel;
  onToggle: (panel: SessionPanel) => void;
  changesSummary?: ChangesSummary;
}

export interface SessionHeaderProps {
  title: string;
  status: SessionHeaderStatus;
  // The running Turn's start, for "4m 12s"; null when no Turn runs.
  startedAt: number | null;
  // The Session's PRs, drawn in the Workbench and Stage.
  pullRequests?: SessionPullRequest[];
  // Absent while the Server cannot merge a PR; Merge PR then stays dimmed.
  onMerge?: (pullRequest: number, method: MergeMethod) => void;
  // The merge method this device used last: Merge PR runs it and its menu ticks it. Squash until one is picked.
  mergeMethod?: MergeMethod;
  onMergeMethodChange?: (method: MergeMethod) => void;
  // Rename and Archive under ⋯, as the Session's row offers them; absent where the page offers neither.
  menu?: SessionMenu;
  // Subagents, Shells and Changes in the Inspector, which the header's triggers open; absent where the page has none.
  panels?: SessionHeaderPanels;
  changes?: SessionChanges;
  // Fixes the clock, for stories and tests.
  now?: number;
}
