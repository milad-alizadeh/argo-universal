import type { SessionOpenError } from '@repo/contracts';
import type { FeedViewItem } from '#features/feed';
import { decodeOpenFailure, openErrorOf } from './open-failure';

// A command or Retry that may have opened the Session; `submittedAt` is 0 until it runs.
export interface OpenAttempt {
  submittedAt: number;
  error: unknown;
  isPending: boolean;
}

export interface SessionProblemSources {
  // The error the Feed closed on, when the Session's open failed.
  feedOpenError: unknown;
  // The Connection dropped the Feed: a toast says why, when the Session never opened.
  feedDropped: boolean;
  retry: OpenAttempt;
  // The Connection dropped Retry's open: a toast says why, and Retry runs again when the Connection reopens.
  retryDropped: boolean;
  // Prompts and setting changes, which open a past Session on the way.
  commands: OpenAttempt[];
  items: FeedViewItem[] | undefined;
}

export type SessionProblem =
  | { type: 'retrying' }
  | { type: 'open'; error: SessionOpenError }
  | { type: 'turn'; id: string; description?: string };

const newer = (last: OpenAttempt, attempt: OpenAttempt): OpenAttempt =>
  last.submittedAt > attempt.submittedAt ? last : attempt;

const latest = (attempts: OpenAttempt[]): OpenAttempt | undefined => {
  const submitted = attempts.filter(({ submittedAt }) => submittedAt > 0);

  return submitted.length > 0 ? submitted.reduce(newer) : undefined;
};

// A Retry that opened the Session cleared the Feed's closure, so any closure here came after it; a dropped Feed is a toast's.
const closure = ({
  feedOpenError,
  feedDropped,
}: SessionProblemSources): SessionOpenError | undefined =>
  feedDropped ? undefined : openErrorOf(feedOpenError);

// Retry's own error is a failed open; a command's only when it carries one.
const refusedOpen = (
  attempt: OpenAttempt,
  retry: OpenAttempt,
): SessionOpenError | undefined =>
  attempt === retry
    ? openErrorOf(attempt.error)
    : decodeOpenFailure(attempt.error);

/*
 * A Retry the Connection dropped asks nothing, and puts an older closure away too: a toast
 * says why, and Retry runs again when the Connection reopens.
 */
const retryDropped = (
  attempt: OpenAttempt | undefined,
  sources: SessionProblemSources,
): boolean => attempt === sources.retry && sources.retryDropped;

const attemptError = (
  attempt: OpenAttempt | undefined,
  retry: OpenAttempt,
): SessionOpenError | undefined =>
  attempt ? refusedOpen(attempt, retry) : undefined;

// The newest attempt speaks when it failed to open; else the Feed's closure.
function openError(
  sources: SessionProblemSources,
): SessionOpenError | undefined {
  const attempt = latest([sources.retry, ...sources.commands]);

  if (retryDropped(attempt, sources)) return undefined;

  return attemptError(attempt, sources.retry) ?? closure(sources);
}

type TurnEnd = Extract<FeedViewItem, { type: 'turn_end' }>;

const lastItem = (
  items: FeedViewItem[] | undefined,
): FeedViewItem | undefined => items?.at(-1);

const endsAuthRequired = (item: FeedViewItem | undefined): item is TurnEnd =>
  item?.type === 'turn_end' && item.end.stopReason === 'auth_required';

const turnProblem = (end: TurnEnd): SessionProblem => ({
  type: 'turn',
  id: end.row.id,
  description: end.end.error?.message,
});

// The Feed's last item, when it is a Turn that ended `auth_required`.
function authRequiredTurn({
  items,
}: SessionProblemSources): SessionProblem | undefined {
  const last = lastItem(items);

  return endsAuthRequired(last) ? turnProblem(last) : undefined;
}

// What a past Session's callout answers: a running Retry, a failed open, or a Turn that needs sign-in.
export function sessionProblem(
  sources: SessionProblemSources,
): SessionProblem | undefined {
  if (sources.retry.isPending) return { type: 'retrying' };

  const error = openError(sources);

  if (error) return { type: 'open', error };

  return authRequiredTurn(sources);
}
