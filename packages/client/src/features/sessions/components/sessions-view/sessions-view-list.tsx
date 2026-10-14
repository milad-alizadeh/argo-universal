import type * as React from 'react';
import { View } from 'react-native';
import { SessionsList } from '../sessions-list/sessions-list';
import type { SessionsListProps } from '../sessions-list/sessions-list-props';
import { SessionsLoading } from '../sessions-loading/sessions-loading';
import type { SessionsViewProps } from './sessions-view';

type ListData = Pick<
  SessionsListProps,
  | 'projects'
  | 'agents'
  | 'sessions'
  | 'query'
  | 'archived'
  | 'selectedSessionId'
>;

function listData(props: SessionsViewProps): ListData {
  return {
    projects: props.projects,
    agents: props.agents,
    sessions: props.sessions,
    query: props.query,
    archived: props.archived,
    selectedSessionId: props.selectedSessionId,
  };
}

type ListActions = Pick<
  SessionsListProps,
  'onNewSession' | 'onProjectSettings' | 'onSelect' | 'onEndReached'
>;

function listActions(props: SessionsViewProps): ListActions {
  return {
    onNewSession: props.onNewSessionInProject,
    onProjectSettings: props.onProjectSettings,
    onSelect: props.onSelect,
    onEndReached: props.onLoadMore,
  };
}

// The list insets it below a transparent header, as it does the rows.
const insetLoading = (
  <View className="-mx-2">
    <SessionsLoading />
  </View>
);

interface SessionsListContentProps extends SessionsViewProps {
  wide: boolean;
  loading: boolean;
}

export function SessionsListContent(
  props: SessionsListContentProps,
): React.JSX.Element {
  return (
    <SessionsList
      {...listData(props)}
      {...listActions(props)}
      placeholder={props.loading ? insetLoading : undefined}
    />
  );
}
