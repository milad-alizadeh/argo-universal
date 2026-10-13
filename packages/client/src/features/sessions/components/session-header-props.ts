import type { SessionStatus } from '@repo/contracts';
import type { MergeMethod } from './merge-pr-button';
import type { SessionPullRequest } from './session-pull-request';

export type SessionHeaderStatus = Extract<
  SessionStatus,
  'running' | 'needs_input' | 'idle'
>;

export interface SessionHeaderProps {
  title: string;
  status: SessionHeaderStatus;
  // The running Turn's start, for "4m 12s"; null when no Turn runs.
  startedAt: number | null;
  // The Session's PRs; the header shows one and lists the rest in a menu.
  pullRequests?: SessionPullRequest[];
  // Absent while the Server cannot merge a PR; Merge PR then stays dimmed.
  onMerge?: (pullRequest: number, method: MergeMethod) => void;
  // Fixes the clock, for stories and tests.
  now?: number;
}
