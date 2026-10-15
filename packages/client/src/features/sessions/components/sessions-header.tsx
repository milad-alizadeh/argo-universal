import type * as React from 'react';
import { Platform } from 'react-native';
import { ListTitle } from '#lib/product/list-title';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import { IconButton } from '#primitives/buttons/icon-button';
import { SearchField } from '#primitives/inputs/search-field';
import type { SessionsFilter } from '../state/sessions-filter';
import { SessionsFilterMenu } from './sessions-filter-menu/sessions-filter-menu';

// On iOS a phone's New Session sits beside the search bar, where it replaces the floating button.
export const newSessionBesideSearch = Platform.OS === 'ios';

export const searchSessionsLabel = 'Search Sessions';

export interface SessionsHeaderProps extends SessionsFilter {
  onNewSession: () => void;
}

const newSessionAppearance = {
  variant: 'ghost',
  size: 'sm',
  className: 'size-7 sm:size-7',
  icon: 'new-session',
  iconRole: 'action',
  iconClassName: 'text-muted-foreground',
} as const;

function SessionsHeaderActions({
  onNewSession,
  ...filter
}: SessionsHeaderProps): React.JSX.Element {
  return (
    <>
      <SessionsFilterMenu {...filter} />
      <IconButton
        {...newSessionAppearance}
        accessibilityLabel="New Session"
        onPress={onNewSession}
      />
    </>
  );
}

// The wide window's Sessions list header row: the title, the filter, New Session, and Search last.
export function SessionsHeader(props: SessionsHeaderProps): React.JSX.Element {
  return (
    <SearchField
      label={searchSessionsLabel}
      value={props.query}
      onChangeText={props.onQueryChange}
      title={<ListTitle>Sessions</ListTitle>}
      actions={<SessionsHeaderActions {...props} />}
    />
  );
}

type HeaderSearch = NonNullable<ScreenHeaderProps['search']>;

// The search in Android's drawer header and the web's JS header; iOS declares its own stock search bar.
export const sessionsHeaderSearch = (filter: SessionsFilter): HeaderSearch => ({
  placeholder: searchSessionsLabel,
  onChangeText: filter.onQueryChange,
});

// The trailing items of Android's drawer header and the web's JS header: the filter, with Search after it.
export function sessionsHeaderItems(
  filter: SessionsFilter,
): React.JSX.Element[] {
  return [<SessionsFilterMenu key="filter" {...filter} />];
}
