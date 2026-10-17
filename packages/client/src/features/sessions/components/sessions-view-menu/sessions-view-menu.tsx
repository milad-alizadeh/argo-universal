import type * as React from 'react';
import {
  HeaderButton,
  headerFilterIcon,
  ListHeaderButton,
} from '#lib/product/header-button';
import { Menu } from '#primitives/overlays/menu';
import {
  isDefaultSessionsView,
  type SessionsView,
} from '../../stores/sessions-view';
import {
  resetSessionsView,
  sessionsViewGroups,
} from '../../utils/sessions-view-menu';

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

function phoneFilterTrigger(changed: boolean): React.JSX.Element {
  return (
    <HeaderButton
      icon={headerFilterIcon}
      paired
      dot={changed ? 'filter' : undefined}
      accessibilityLabel={triggerLabel}
    />
  );
}

const viewTriggers = (
  changed: boolean,
): React.ComponentProps<typeof Menu>['trigger'] => ({
  compact: phoneFilterTrigger(changed),
  wide: wideFilterTrigger(changed),
});

/*
 * How the Sessions list orders, groups, filters and lays out its rows, then Reset to default.
 * The trigger carries a dot while the view is not the default; on a phone it is a native header item.
 */
export function SessionsViewMenu({
  view,
  onViewChange,
}: SessionsViewMenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={triggerLabel}
      groups={sessionsViewGroups(view, onViewChange)}
      trailingActions={[resetSessionsView(view, onViewChange)]}
      trigger={viewTriggers(!isDefaultSessionsView(view))}
    />
  );
}
