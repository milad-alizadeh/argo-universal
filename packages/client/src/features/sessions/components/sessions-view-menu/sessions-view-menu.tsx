import { Menu } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { ListHeaderButton } from '#lib/product/header-button';
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

// The dot is only seen, so a changed view says so after the name, as the dot's own label once did.
const changedLabel = `${triggerLabel}, Changed`;

function filterTrigger(changed: boolean): React.JSX.Element {
  return (
    <ListHeaderButton
      icon="filters"
      dot={changed ? 'filter' : undefined}
      accessibilityLabel={changed ? changedLabel : triggerLabel}
    />
  );
}

/*
 * How the Sessions list lays out, groups and filters its rows.
 * The wide sidebar's header draws it; a phone's Sessions root declares the same choices as a submenu in its Screen header.
 * The trigger carries a dot while the view is not the default.
 */
export function SessionsViewMenu({
  view,
  onViewChange,
}: SessionsViewMenuProps): React.JSX.Element {
  const changed = !isDefaultSessionsView(view);

  return (
    <Menu
      accessibilityLabel={changed ? changedLabel : triggerLabel}
      groups={sessionsViewGroups(view, onViewChange)}
      trigger={filterTrigger(changed)}
    />
  );
}
