import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { SearchField } from '@repo/kit/primitives/inputs/search-field';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ListTitle } from '#lib/product/list-title';
import type { SessionsViewState } from '../stores/sessions-view-state';
import { SessionsViewMenu } from './sessions-view-menu/sessions-view-menu';

export const searchSessionsLabel = 'Search Sessions';

export interface SessionsHeaderProps extends SessionsViewState {
  onNewSession: () => void;
}

const newSessionAppearance = {
  variant: 'ghost',
  size: 'xs',
  className: 'size-7 sm:size-7',
  icon: 'new-session',
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

// The wide window's Sessions list header row (Paper "SessionsList"): the title, Search, the view menu, then New Session.
export function SessionsHeader(props: SessionsHeaderProps): React.JSX.Element {
  return (
    <SearchField
      sidebar={Platform.OS === 'web'}
      label={searchSessionsLabel}
      value={props.query}
      onChangeText={props.onQueryChange}
      title={<ListTitle>Sessions</ListTitle>}
      actions={<SessionsHeaderActions {...props} />}
    />
  );
}
