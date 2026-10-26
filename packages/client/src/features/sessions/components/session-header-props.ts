import type { ChangesSummary, SessionStatus } from '@repo/contracts';
import type { SessionMenu } from './session-actions';
import type { SessionPullRequest } from './session-pull-request';
import type { SessionWorkbench } from './session-workbench';

export type SessionHeaderStatus = Extract<
  SessionStatus,
  'running' | 'needs_input' | 'idle'
>;

export interface SessionChanges {
  summary?: ChangesSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SessionHeaderProps {
  title: string;
  status: SessionHeaderStatus;
  // The running Turn's start, for "4m 12s"; null when no Turn runs.
  startedAt: number | null;
  // The Session's PRs, drawn in the Workbench and Stage.
  pullRequests?: SessionPullRequest[];
  // Rename and Archive under ⋯, as the Session's row offers them; absent where the page offers neither.
  menu?: SessionMenu;
  // The Session's Sections as Workbench cards; absent where the page has none.
  workbench?: SessionWorkbench;
  changes?: SessionChanges;
  // Fixes the clock, for stories and tests.
  now?: number;
}
