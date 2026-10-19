import type { SessionListInput } from '@repo/contracts';
import {
  defaultSessionsView,
  type SessionsStatus,
  type SessionsView,
  sessionsStatusChoices,
} from '../stores/sessions-view';

// The `archived` filter of a status: whether its Sessions are archived, or undefined for both.
const statusArchived = (status: SessionsStatus): boolean | undefined =>
  sessionsStatusChoices.find((choice) => choice.value === status)?.archived;

// Whether a Session shows under a status, by the same filter `session.list` applies.
export function showsUnderStatus(
  status: SessionsStatus,
  archivedAt: number | null,
): boolean {
  const archived = statusArchived(status);

  return archived === undefined || (archivedAt !== null) === archived;
}

// What `session.list` is asked for a view and a search: its status's `archived` filter; an empty search asks for every title.
export function sessionsListInput(
  view: SessionsView,
  query: string,
): Pick<SessionListInput, 'archived' | 'query'> {
  return {
    archived: statusArchived(view.status),
    query: query || undefined,
  };
}

/*
 * The view an older Server can list, when it refused this one: a Server from before Status All answers BAD_REQUEST
 * to a request without `archived`, so All falls back to Active.
 * Undefined when the refusal is not that, so the list shows its load failure as before.
 */
export function olderServerView(
  view: SessionsView,
  errorCode: string | undefined,
): SessionsView | undefined {
  if (errorCode !== 'BAD_REQUEST' || view.status !== 'all') return undefined;

  return { ...view, status: defaultSessionsView.status };
}
