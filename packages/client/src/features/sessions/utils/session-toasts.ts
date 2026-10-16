import { errorToast } from '#lib/generic/error-toast';
import type { ErrorToast } from '#primitives/overlays/toast';
import { connectionDropped, sessionOpenFailedTitle } from './open-failure';

// The App's words for a dropped Connection, as the Agent sign-in sheet says it.
export const connectionLostTitle = 'Connection lost';

// One drop shows one toast, however many of the Session's calls it ended.
const droppedKey = 'connection-dropped';

export interface DroppedConnectionSources {
  // Errors of opens that never happened: New Session's open, or a Retry.
  opens: unknown[];
  // The error the Session's Feed ended on.
  feed?: unknown;
  // The Session was open on this page before its Feed ended.
  opened?: boolean;
}

// What the Feed's drop says: the open Session lost its Connection, or it never opened.
const feedTitle = (opened: boolean | undefined): string =>
  opened ? connectionLostTitle : sessionOpenFailedTitle;

/*
 * The error toast for a dropped Connection, as for a failed load; the Agent's own failures
 * are the callout's. An open that never happened couldn't open the Session; an open Session
 * lost its Connection. Calls that drop together show one toast.
 */
export function droppedConnectionToast({
  opens,
  feed,
  opened,
}: DroppedConnectionSources): ErrorToast | undefined {
  const open = opens.find(connectionDropped);

  if (open !== undefined)
    return errorToast(sessionOpenFailedTitle, open, droppedKey);

  return connectionDropped(feed)
    ? errorToast(feedTitle(opened), feed, droppedKey)
    : undefined;
}

// The Agent's sign-in methods could not be read: the callout keeps Loading…, and the read runs again on reconnect or focus.
export const signInReadToast = (cause: unknown): ErrorToast | undefined =>
  errorToast("Couldn't check sign-in", cause);
