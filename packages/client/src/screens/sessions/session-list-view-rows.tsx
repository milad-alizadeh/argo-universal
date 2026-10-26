import type * as React from 'react';
import {
  type SessionsLayout,
  SessionsList,
  type SessionsListProps,
  SessionsLoading,
} from '#features/sessions';
import type { SessionListViewProps } from './session-list-view';

type ListData = Pick<
  SessionsListProps,
  'projects' | 'agents' | 'sessions' | 'query' | 'view' | 'selectedSessionId'
>;

function listData(props: SessionListViewProps): ListData {
  return {
    projects: props.projects,
    agents: props.agents,
    sessions: props.sessions,
    query: props.query,
    view: props.view,
    selectedSessionId: props.selectedSessionId,
  };
}

type ListActions = Pick<
  SessionsListProps,
  | 'onNewSession'
  | 'onStartSession'
  | 'onProjectSettings'
  | 'onSelect'
  | 'onRename'
  | 'onArchive'
  | 'onArchiveMany'
  | 'onRefresh'
  | 'onEndReached'
>;

function listActions(props: SessionListViewProps): ListActions {
  return {
    onNewSession: props.onNewSessionInProject,
    onStartSession: props.onNewSession,
    onProjectSettings: props.onProjectSettings,
    onSelect: props.onSelect,
    onRename: props.onRename,
    onArchive: props.onArchive,
    onArchiveMany: props.onArchiveMany,
    onRefresh: props.onRefresh,
    onEndReached: props.onLoadMore,
  };
}

// The list insets it below a transparent header, as it does the rows.
const insetLoading = (layout: SessionsLayout): React.JSX.Element => (
  <SessionsLoading layout={layout} inList />
);

interface SessionsListContentProps extends SessionListViewProps {
  loading: boolean;
}

export function SessionsListContent(
  props: SessionsListContentProps,
): React.JSX.Element {
  return (
    <SessionsList
      {...listData(props)}
      {...listActions(props)}
      placeholder={props.loading ? insetLoading(props.view.layout) : undefined}
    />
  );
}
