import type * as React from 'react';
import type { SessionsStatus } from '../../stores/sessions-view';
import type { SessionsListProps } from './sessions-list-props';
import { EmptyList } from './sessions-list-rows';

type EmptySessionsListProps = Pick<SessionsListProps, 'query' | 'view'>;

interface EmptyCopy {
  // Under Project headings an Active or All list keeps every Project's row, so it is empty only with no Projects.
  grouped: string;
  // One list has no Project rows, so with nothing in it the list is out of Sessions.
  oneList: string;
  // Which Sessions a search missed, in the line under the title.
  searched: string;
}

const emptyCopy = {
  active: {
    grouped: 'No Projects yet',
    oneList: 'No active Sessions',
    searched: 'No Active Session',
  },
  archived: {
    grouped: 'No archived Sessions',
    oneList: 'No archived Sessions',
    searched: 'No Archived Session',
  },
  all: {
    grouped: 'No Projects yet',
    oneList: 'No Sessions',
    searched: 'No Session',
  },
} satisfies Record<SessionsStatus, EmptyCopy>;

function emptyListTitle({ query, view }: EmptySessionsListProps): string {
  if (query) return 'No matching Sessions';

  const copy = emptyCopy[view.status];

  return view.group === 'none' ? copy.oneList : copy.grouped;
}

function noMatchingSession({
  query,
  view,
}: EmptySessionsListProps): string | undefined {
  if (!query) return undefined;

  return `${emptyCopy[view.status].searched} has "${query}" in its title.`;
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
