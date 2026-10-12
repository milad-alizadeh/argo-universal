import type * as React from 'react';
import { Platform } from 'react-native';
import { ListTitle } from '#lib/product/list-title';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { SearchField } from '#primitives/inputs/search-field/search-field';
import type { SessionsFilter } from '../state/sessions-filter';
import { SessionsFilterMenu } from './sessions-filter-menu/sessions-filter-menu';

// On iOS a phone's New Session sits beside the search bar, where it replaces the floating button.
export const newSessionBesideSearch = Platform.OS === 'ios';

export interface SessionsHeaderProps extends SessionsFilter {
  onNewSession: () => void;
}

// The wide window's Sessions list header row: the title, the filter, New Session, and Search last.
export function SessionsHeader({
  onNewSession,
  ...filter
}: SessionsHeaderProps): React.JSX.Element {
  return (
    <SearchField
      label="Search Sessions"
      value={filter.query}
      onChangeText={filter.onQueryChange}
      title={<ListTitle>Sessions</ListTitle>}
      actions={
        <>
          <SessionsFilterMenu {...filter} />
          <IconButton
            variant="ghost"
            size="md"
            className="size-7 sm:size-7"
            icon="new-session"
            iconSize="sm"
            iconClassName="text-muted-foreground"
            accessibilityLabel="New Session"
            onPress={onNewSession}
          />
        </>
      }
    />
  );
}

// A phone's native header search; on iOS New Session is a header item, on Android its own round button.
export function sessionsHeaderSearch(
  filter: SessionsFilter,
  onNewSession: () => void,
): NonNullable<ScreenHeaderProps['search']> {
  return {
    placeholder: 'Search Sessions',
    onChangeText: filter.onQueryChange,
    ...(newSessionBesideSearch && {
      action: {
        icon: 'new-session',
        accessibilityLabel: 'New Session',
        onPress: onNewSession,
      },
    }),
  };
}

// A phone's trailing header items: the filter, with Search after it.
export function sessionsHeaderItems(
  filter: SessionsFilter,
): React.JSX.Element[] {
  return [<SessionsFilterMenu key="filter" {...filter} />];
}
