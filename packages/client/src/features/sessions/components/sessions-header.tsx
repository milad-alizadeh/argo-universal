import type * as React from 'react';
import { Platform } from 'react-native';
import { ListTitle } from '#lib/product/list-title';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import { IconButton } from '#primitives/actions/icon-button';
import { SearchField } from '#primitives/inputs/search-field';
import type { SessionsViewState } from '../stores/sessions-view-state';
import { SessionsViewMenu } from './sessions-view-menu/sessions-view-menu';

// On iOS a phone's New Session sits beside the search bar, where it replaces the floating button.
export const newSessionBesideSearch = Platform.OS === 'ios';

export const searchSessionsLabel = 'Search Sessions';

export interface SessionsHeaderProps extends SessionsViewState {
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
  ...viewState
}: SessionsHeaderProps): React.JSX.Element {
  return (
    <>
      <SessionsViewMenu {...viewState} />
      <IconButton
        {...newSessionAppearance}
        accessibilityLabel="New Session"
        onPress={onNewSession}
      />
    </>
  );
}

// The wide window's Sessions list header row: the title, the view menu, New Session, and Search last.
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
export const sessionsHeaderSearch = (
  viewState: SessionsViewState,
): HeaderSearch => ({
  placeholder: searchSessionsLabel,
  onChangeText: viewState.onQueryChange,
});

// The trailing items of Android's drawer header and the web's JS header: the view menu, with Search after it.
export function sessionsHeaderItems(
  viewState: SessionsViewState,
): React.JSX.Element[] {
  return [<SessionsViewMenu key="view" {...viewState} />];
}
