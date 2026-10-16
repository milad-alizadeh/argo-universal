import { errorToast } from '#lib/generic/error-toast';
import type { ErrorToast } from '#primitives/overlays/toast';
import type { SessionProblemSources } from '../state/session-problem';
import { sessionOpenFailedTitle } from './open-failure';

// One drop shows one toast, however many of the Session's calls it ended.
const droppedKey = 'connection-dropped';

export interface DroppedOpenSources {
  // The error of an open the Connection dropped: New Session's open, or a Retry.
  open?: unknown;
  // The error the Feed ended on, when the Connection dropped it.
  feed?: unknown;
  // The Session was open on this page before its Feed ended.
  opened?: boolean;
}

/*
 * The error toast for an open the Connection dropped, as for a failed load; the Agent's own
 * failures are the callout's. A Session that is already open shows none: the App already says
 * it is reconnecting. Calls that drop together show one toast.
 */
export const droppedOpenToast = ({
  open,
  feed,
  opened,
}: DroppedOpenSources): ErrorToast | undefined =>
  errorToast(
    sessionOpenFailedTitle,
    open || (opened ? undefined : feed),
    droppedKey,
  );

type PastSessionDrops = Pick<
  SessionProblemSources,
  'retry' | 'retryDropped' | 'feedOpenError' | 'feedDropped'
>;

// A past Session's drop: a Retry that never opened it, or a Feed that dropped before it opened.
export const pastSessionDropToast = (
  sources: PastSessionDrops,
  opened: boolean,
): ErrorToast | undefined =>
  droppedOpenToast({
    open: sources.retryDropped ? sources.retry.error : undefined,
    feed: sources.feedDropped ? sources.feedOpenError : undefined,
    opened,
  });

// The Agent's sign-in methods could not be read: the callout keeps Loading…, and the read runs again on reconnect or focus.
export const signInReadToast = (cause: unknown): ErrorToast | undefined =>
  errorToast("Couldn't check sign-in", cause);
