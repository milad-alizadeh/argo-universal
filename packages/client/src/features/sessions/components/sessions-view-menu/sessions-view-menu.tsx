import type * as React from 'react';
import { ListHeaderButton } from '#lib/product/header-button';
import { Menu } from '#primitives/overlays/menu';
import {
  isDefaultSessionsView,
  type SessionsView,
} from '../../stores/sessions-view';
import { sessionsViewGroups } from '../../utils/sessions-view-menu';

export interface SessionsViewMenuProps {
  view: SessionsView;
  onViewChange: (view: SessionsView) => void;
}

// The App E2E steps find the trigger by this name.
const triggerLabel = 'Filter Sessions';

function wideFilterTrigger(changed: boolean): React.JSX.Element {
  return (
    <ListHeaderButton
      icon="filters"
      dot={changed ? 'filter' : undefined}
      accessibilityLabel={triggerLabel}
    />
  );
}

/*
 * How the Sessions list lays out, groups and filters its rows.
 * The wide sidebar's header draws it; a phone's Sessions Page declares the same choices as its filter Action.
 * The trigger carries a dot while the view is not the default.
 */
export function SessionsViewMenu({
  view,
  onViewChange,
}: SessionsViewMenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={triggerLabel}
      groups={sessionsViewGroups(view, onViewChange)}
      trigger={wideFilterTrigger(!isDefaultSessionsView(view))}
    />
  );
}
