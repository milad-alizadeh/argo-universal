import type { SessionStatus } from '@repo/contracts';
import type { MergeMethod } from '../state/merge-method';
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
  // The merge method this device used last: Merge PR runs it and its menu ticks it. Squash until one is picked.
  mergeMethod?: MergeMethod;
  onMergeMethodChange?: (method: MergeMethod) => void;
  // Fixes the clock, for stories and tests.
  now?: number;
}
