import type { SessionOpenError } from '@repo/contracts';
import type { FeedViewItem } from '#features/feed';
import {
  openFailureOf,
  sessionOpenError,
} from '../components/failure-messages';

// A command or Retry that may have opened the Session; `submittedAt` is 0 until it runs.
export interface OpenAttempt {
  submittedAt: number;
  error: unknown;
  isPending: boolean;
}

export interface SessionProblemSources {
  // The error the Feed closed on, when the Session's open failed.
  feedOpenError: unknown;
  retry: OpenAttempt;
  // Prompts and setting changes, which open a past Session on the way.
  commands: OpenAttempt[];
  items: FeedViewItem[] | undefined;
  // The `auth_required` Turn end a sign-in has since answered.
  signedInAfter?: string;
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

// Retry's own error is always a refused open; a command's only when it carries one.
const refusedOpen = (
  attempt: OpenAttempt,
  retry: OpenAttempt,
): SessionOpenError | undefined => {
  if (!attempt.error) return undefined;

  return attempt === retry
    ? sessionOpenError(attempt.error)
    : openFailureOf(attempt.error);
};

// A Retry that settled cleared the Feed's closure; otherwise the closure stands.
const closure = (
  attempt: OpenAttempt | undefined,
  { retry, feedOpenError }: SessionProblemSources,
): SessionOpenError | undefined =>
  attempt !== retry && feedOpenError
    ? sessionOpenError(feedOpenError)
    : undefined;

// The newest attempt speaks: Retry's own error, or a command's refused open; else the Feed's closure.
function openError(
  sources: SessionProblemSources,
): SessionOpenError | undefined {
  const attempt = latest([sources.retry, ...sources.commands]);

  return (
    (attempt && refusedOpen(attempt, sources.retry)) ??
    closure(attempt, sources)
  );
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

// The Feed's last item, when it is a Turn that ended `auth_required` and no sign-in has answered it.
function authRequiredTurn({
  items,
  signedInAfter,
}: SessionProblemSources): SessionProblem | undefined {
  const last = lastItem(items);

  if (!endsAuthRequired(last) || last.row.id === signedInAfter)
    return undefined;

  return turnProblem(last);
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
