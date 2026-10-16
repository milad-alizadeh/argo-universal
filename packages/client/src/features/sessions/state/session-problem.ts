import type { SessionOpenError } from '@repo/contracts';
import type { FeedViewItem } from '#features/feed';
import { decodeOpenFailure } from '../utils/open-failure';

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

// An attempt's error is the callout's only when it is a refused open; a dropped Connection is a toast's.
const refusedOpen = (attempt: OpenAttempt): SessionOpenError | undefined =>
  decodeOpenFailure(attempt.error);

// A Retry that opened the Session cleared the Feed's closure, so any closure here came after it.
const closure = ({
  feedOpenError,
}: SessionProblemSources): SessionOpenError | undefined =>
  decodeOpenFailure(feedOpenError);

// The newest attempt speaks when it was refused; else the Feed's closure.
function openError(
  sources: SessionProblemSources,
): SessionOpenError | undefined {
  const attempt = latest([sources.retry, ...sources.commands]);

  return (attempt && refusedOpen(attempt)) ?? closure(sources);
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
