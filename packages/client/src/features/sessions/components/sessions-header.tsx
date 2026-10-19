import type * as React from 'react';
import { ListTitle } from '#lib/product/list-title';
import { IconButton } from '#primitives/actions/icon-button';
import { SearchField } from '#primitives/inputs/search-field';
import type { SessionsViewState } from '../stores/sessions-view-state';
import { SessionsViewMenu } from './sessions-view-menu/sessions-view-menu';

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
