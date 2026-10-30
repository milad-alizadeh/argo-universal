import type * as React from 'react';
import { SessionsList, type SessionsListProps } from '#features/sessions';
import type { SessionListViewProps } from './session-list-view';

type ListData = Pick<
  SessionsListProps,
  | 'projects'
  | 'agents'
  | 'sessions'
  | 'query'
  | 'view'
  | 'selectedSessionId'
  | 'plugins'
>;

function listData(props: SessionListViewProps): ListData {
  return {
    projects: props.projects,
    agents: props.agents,
    sessions: props.sessions,
    query: props.query,
    view: props.view,
    selectedSessionId: props.selectedSessionId,
    plugins: props.plugins,
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

export function SessionsListContent(
  props: SessionListViewProps,
): React.JSX.Element {
  return <SessionsList {...listData(props)} {...listActions(props)} />;
}
