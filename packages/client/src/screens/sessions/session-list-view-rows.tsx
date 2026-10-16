import type * as React from 'react';
import { Platform, View } from 'react-native';
import {
  type SessionsLayout,
  SessionsList,
  type SessionsListProps,
  SessionsLoading,
} from '#features/sessions';
import type { SessionListViewProps } from './session-list-view';

type ListData = Pick<
  SessionsListProps,
  | 'projects'
  | 'agents'
  | 'sessions'
  | 'query'
  | 'archived'
  | 'layout'
  | 'flat'
  | 'selectedSessionId'
>;

// Android's full-screen search lists its results flat, as Paper's search does; elsewhere they stay under their Projects.
const searchListsFlat = Platform.OS === 'android';

function listData(props: SessionListViewProps): ListData {
  return {
    projects: props.projects,
    agents: props.agents,
    sessions: props.sessions,
    query: props.query,
    archived: props.archived,
    layout: props.layout,
    flat: searchListsFlat && props.query !== '',
    selectedSessionId: props.selectedSessionId,
  };
}

type ListActions = Pick<
  SessionsListProps,
  'onNewSession' | 'onProjectSettings' | 'onSelect' | 'onEndReached'
>;

function listActions(props: SessionListViewProps): ListActions {
  return {
    onNewSession: props.onNewSessionInProject,
    onProjectSettings: props.onProjectSettings,
    onSelect: props.onSelect,
    onEndReached: props.onLoadMore,
  };
}

// The list insets it below a transparent header, as it does the rows.
function insetLoading(layout?: SessionsLayout): React.JSX.Element {
  return (
    <View className="-mx-4 wide:mx-0">
      <SessionsLoading layout={layout} />
    </View>
  );
}

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
      placeholder={props.loading ? insetLoading(props.layout) : undefined}
    />
  );
}
