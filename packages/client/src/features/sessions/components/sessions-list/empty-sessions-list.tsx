import type * as React from 'react';
import { Button } from '#primitives/actions/button';
import type { EmptyStateProps } from '#primitives/status/empty-state';
import { EmptyState } from '#primitives/status/empty-state';
import type { SessionsStatus } from '../../stores/sessions-view';
import type { SessionsListProps } from './sessions-list-props';

type EmptySessionsListProps = Pick<
  SessionsListProps,
  'query' | 'view' | 'onStartSession'
>;

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
function emptyStateProps(
  props: EmptySessionsListProps,
): Pick<EmptyStateProps, 'icon' | 'title' | 'description' | 'action'> {
  const searched = Boolean(props.query);

  return {
    icon: searched ? 'search' : 'message',
    title: emptyListTitle(props),
    description: noMatchingSession(props) ?? sessionPrompt(searched),
    action: sessionAction(searched, props.onStartSession),
  };
}

function sessionPrompt(searched: boolean): string | undefined {
  return searched ? undefined : 'Start a Session to work with an Agent.';
}

function sessionAction(
  searched: boolean,
  onStartSession: EmptySessionsListProps['onStartSession'],
): React.JSX.Element | undefined {
  return searched ? undefined : (
    <Button label="New Session" onPress={onStartSession} />
  );
}

export function EmptySessionsList(
  props: EmptySessionsListProps,
): React.JSX.Element {
  return <EmptyState {...emptyStateProps(props)} />;
}
