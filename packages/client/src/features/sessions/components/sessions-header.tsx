import type * as React from 'react';
import { Platform } from 'react-native';
import { HeaderButton } from '#lib/product/header-button';
import type { SessionsFilter } from '../state/sessions-filter';
import { ListSearch } from './list-search';
import { SessionsFilterMenu } from './sessions-filter-menu';

// On iOS a phone's New Session sits in the header, where it replaces the floating button.
export const newSessionInHeader = Platform.OS === 'ios';

// The Sessions part of the wide window's list header row: the title with search, and the filter.
export function SessionsHeader(filter: SessionsFilter): React.JSX.Element {
  return (
    <>
      <ListSearch
        title="Sessions"
        value={filter.query}
        onChangeText={filter.onQueryChange}
      />
      <SessionsFilterMenu {...filter} />
    </>
  );
}

// A phone's trailing header items, each its own button: the filter, then New Session on iOS.
export function sessionsHeaderItems(
  filter: SessionsFilter,
  onNewSession: () => void,
): React.JSX.Element[] {
  return [
    <SessionsFilterMenu key="filter" {...filter} />,
    ...(newSessionInHeader
      ? [
          <HeaderButton
            key="new-session"
            icon="new-session"
            paired
            accessibilityLabel="New Session"
            onPress={onNewSession}
          />,
        ]
      : []),
  ];
}
