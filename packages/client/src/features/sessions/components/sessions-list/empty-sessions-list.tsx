import type * as React from 'react';
import type { SessionsStatus } from '../../stores/sessions-view';
import type { SessionsListProps } from './sessions-list-props';
import { EmptyList } from './sessions-list-rows';

type EmptySessionsListProps = Pick<
  SessionsListProps,
  'query' | 'status' | 'group'
>;

// Under Project headings an Active or All list keeps every Project's row, so it is empty only with no Projects.
const groupedTitles = {
  active: 'No Projects yet',
  archived: 'No archived Sessions',
  all: 'No Projects yet',
} satisfies Record<SessionsStatus, string>;

// One list has no Project rows, so with nothing in it the list is out of Sessions.
const oneListTitles = {
  active: 'No active Sessions',
  archived: 'No archived Sessions',
  all: 'No Sessions',
} satisfies Record<SessionsStatus, string>;

function emptyListTitle({
  query,
  status,
  group,
}: EmptySessionsListProps): string {
  if (query) return 'No matching Sessions';

  return (group === 'none' ? oneListTitles : groupedTitles)[status];
}

const searchedStatus = {
  active: 'No Active Session',
  archived: 'No Archived Session',
  all: 'No Session',
} satisfies Record<SessionsStatus, string>;

function noMatchingSession({
  query,
  status,
}: EmptySessionsListProps): string | undefined {
  if (!query) return undefined;

  return `${searchedStatus[status]} has "${query}" in its title.`;
}

// What the Sessions list says with no rows to show, for its search, status and grouping.
export function EmptySessionsList(
  props: EmptySessionsListProps,
): React.JSX.Element {
  return (
    <EmptyList
      title={emptyListTitle(props)}
      message={noMatchingSession(props)}
    />
  );
}
