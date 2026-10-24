import { Menu } from '@repo/kit/primitives/overlays/menu';
import type { IconName } from '@repo/kit/symbols/icon-names';
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
  // The trigger's icon; the wide sidebar's sliders unless a phone's platform draws another.
  icon?: IconName;
}

// The App E2E steps find the trigger by this name.
const triggerLabel = 'Filter Sessions';

// The dot is only seen, so a changed view says so after the name, as the dot's own label once did.
const changedLabel = `${triggerLabel}, Changed`;

function filterTrigger(changed: boolean, icon: IconName): React.JSX.Element {
  return (
    <ListHeaderButton
      icon={icon}
      dot={changed ? 'filter' : undefined}
      accessibilityLabel={changed ? changedLabel : triggerLabel}
    />
  );
}

/*
 * How the Sessions list lays out, groups and filters its rows.
 * The wide sidebar's header draws it; a phone's Sessions root draws it above the list, since a header holds verbs only.
 * The trigger carries a dot while the view is not the default.
 */
export function SessionsViewMenu({
  view,
  onViewChange,
  icon = 'filters',
}: SessionsViewMenuProps): React.JSX.Element {
  const changed = !isDefaultSessionsView(view);

  return (
    <Menu
      accessibilityLabel={changed ? changedLabel : triggerLabel}
      groups={sessionsViewGroups(view, onViewChange)}
      trigger={filterTrigger(changed, icon)}
    />
  );
}
