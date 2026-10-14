import type * as React from 'react';
import { View } from 'react-native';
import { SearchField } from '#primitives/inputs/search-field';
import { SessionsList } from '../sessions-list/sessions-list';
import type { SessionsListProps } from '../sessions-list/sessions-list-props';
import { SessionsLoading } from '../sessions-loading/sessions-loading';
import type { SessionsViewProps } from './sessions-view';

const phoneSearchAppearance = {
  variant: 'docked',
  label: 'Search Sessions',
  leading: 'menu',
  className: 'px-4 pt-2 pb-2',
} as const;

function PhoneSessionsSearch({
  query,
  onQueryChange,
}: Pick<SessionsViewProps, 'query' | 'onQueryChange'>): React.JSX.Element {
  return (
    <View className="-mx-2 -mt-5">
      <SearchField
        {...phoneSearchAppearance}
        value={query}
        onChangeText={onQueryChange}
      />
    </View>
  );
}

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
      // On a phone the rows scroll under the header, so what sits above them scrolls too.
      header={props.wide ? undefined : <PhoneSessionsSearch {...props} />}
      placeholder={props.loading ? insetLoading : undefined}
    />
  );
}
