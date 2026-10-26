import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { SearchField } from '@repo/kit/primitives/controls/search-field';
import { useSelectionModeHost } from '@repo/kit/selection-mode';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ListTitle } from '#lib/product/list-title';
import type { SessionsViewState } from '../stores/sessions-view-state';
import { SessionsViewMenu } from './sessions-view-menu/sessions-view-menu';

export const searchSessionsLabel = 'Search Sessions';

export interface SessionsHeaderProps extends SessionsViewState {
  onNewSession: () => void;
}

const newSessionButton = {
  accessibilityLabel: 'New Session',
  variant: 'ghost',
  size: 'sm',
  className: 'size-7 sm:size-7',
  icon: 'new-session',
  iconClassName: 'text-muted-foreground',
} as const;

// iOS starts selection from a Select entry, which the sidebar's own header draws as a Screen's would.
function SelectEntry(): React.ReactNode {
  const begin = useSelectionModeHost()?.begin;

  return begin ? (
    <Button label="Select" variant="text" onPress={begin} />
  ) : null;
}

function SessionsHeaderActions({
  onNewSession,
  ...viewState
}: SessionsHeaderProps): React.JSX.Element {
  return (
    <>
      <SelectEntry />
      <SessionsViewMenu {...viewState} />
      <IconButton {...newSessionButton} onPress={onNewSession} />
    </>
  );
}

// The wide window's Sessions list header row (Paper "SessionsList"): the title, Search, the view menu, then New Session.
export function SessionsHeader(props: SessionsHeaderProps): React.ReactNode {
  const selecting = useSelectionModeHost()?.header;

  if (selecting) return selecting;

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
