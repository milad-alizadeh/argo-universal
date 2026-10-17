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

/*
 * What `session.list` is asked for a view and a search: its status's `archived` filter and its order; an empty search asks for every title.
 * Last activity is the Server's default order, so it goes unsaid, and a Server from before `order` still answers the default view.
 */
export function sessionsListInput(
  view: SessionsView,
  query: string,
): Pick<SessionListInput, 'archived' | 'order' | 'query'> {
  const input: Pick<SessionListInput, 'archived' | 'order' | 'query'> = {
    archived: statusArchived(view.status),
    query: query || undefined,
  };

  if (view.order === 'created') input.order = view.order;

  return input;
}

// The choices a Server from before Status All and Order Created does not know, field by field.
const newerServerChoices: Pick<SessionsView, 'status' | 'order'> = {
  status: 'all',
  order: 'created',
};

type NewerServerField = keyof typeof newerServerChoices;

// A field's default when the view chose what an older Server does not know, else the view's own choice.
const olderServerChoice = <Field extends NewerServerField>(
  view: SessionsView,
  field: Field,
): SessionsView[Field] =>
  view[field] === newerServerChoices[field]
    ? defaultSessionsView[field]
    : view[field];

/*
 * The view an older Server can list, when it refused this one: a Server from before Status All and Order Created
 * answers BAD_REQUEST to a request without `archived` or with `order`, so those fields fall back to Active and Last activity.
 * Undefined when the refusal is not that, so the list shows its load failure as before.
 */
export function olderServerView(
  view: SessionsView,
  errorCode: string | undefined,
): SessionsView | undefined {
  const older: SessionsView = {
    ...view,
    status: olderServerChoice(view, 'status'),
    order: olderServerChoice(view, 'order'),
  };

  if (errorCode !== 'BAD_REQUEST' || isSameView(older, view)) return undefined;

  return older;
}

const isSameView = (older: SessionsView, view: SessionsView): boolean =>
  older.status === view.status && older.order === view.order;
