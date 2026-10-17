import type * as React from 'react';
import {
  HeaderButton,
  HeaderButtonDot,
  headerFilterIcon,
} from '#lib/product/header-button';
import { IconButton } from '#primitives/buttons/icon-button';
import {
  Menu,
  type MenuAction,
  type MenuChoiceGroup,
} from '#primitives/overlays/menu';
import {
  defaultSessionsView,
  isDefaultSessionsView,
  type SessionsView,
  sessionsGroupChoices,
  sessionsLayoutChoices,
  sessionsOrderChoices,
  sessionsStatusChoices,
} from '../../stores/sessions-view';

// Each of the view's fields as one group of the menu, under its heading, in Paper's order.
export const sessionsViewGroups = [
  { field: 'order', label: 'Order by', options: sessionsOrderChoices },
  { field: 'group', label: 'Group by', options: sessionsGroupChoices },
  { field: 'status', label: 'Status', options: sessionsStatusChoices },
  { field: 'layout', label: 'Layout', options: sessionsLayoutChoices },
] as const;

export const resetSessionsViewLabel = 'Reset to default';

export interface SessionsFilterMenuProps {
  view: SessionsView;
  onViewChange: (view: SessionsView) => void;
}

const filterLabel = 'Filter Sessions';

const wideFilterAppearance = {
  variant: 'ghost',
  size: 'sm',
  className: 'size-7 sm:size-7',
  icon: 'filters',
  iconRole: 'action',
  iconClassName: 'text-muted-foreground',
} as const;

// The dot a header button draws, set over the icon of the wide window's smaller button.
const wideFilterDot = <HeaderButtonDot dot="filter" place="top-1 right-1" />;

function wideFilterTrigger(changed: boolean): React.JSX.Element {
  return (
    <IconButton
      {...wideFilterAppearance}
      accessibilityLabel={filterLabel}
      badge={changed ? wideFilterDot : undefined}
    />
  );
}

function phoneFilterTrigger(changed: boolean): React.JSX.Element {
  return (
    <HeaderButton
      icon={headerFilterIcon}
      paired
      dot={changed ? 'filter' : undefined}
      accessibilityLabel={filterLabel}
    />
  );
}

const filterTriggers = (
  changed: boolean,
): React.ComponentProps<typeof Menu>['trigger'] => ({
  compact: phoneFilterTrigger(changed),
  wide: wideFilterTrigger(changed),
});

type ViewGroup = (typeof sessionsViewGroups)[number];

// A group sets only its own field; a value that is none of its options is ignored.
function viewGroup(
  { field, label, options }: ViewGroup,
  { view, onViewChange }: SessionsFilterMenuProps,
): MenuChoiceGroup {
  return {
    label,
    value: view[field],
    options,
    onValueChange: (value) => {
      const chosen = options.find((option) => option.value === value);

      if (chosen) onViewChange({ ...view, [field]: chosen.value });
    },
  };
}

// Restores every field's default; there is nothing to reset while the view is the default.
const resetAction = ({
  view,
  onViewChange,
}: SessionsFilterMenuProps): MenuAction => ({
  label: resetSessionsViewLabel,
  disabled: isDefaultSessionsView(view),
  onPress: () => onViewChange(defaultSessionsView),
});

/*
 * How the Sessions list orders, groups, filters and lays out its rows, then Reset to default.
 * The trigger carries a dot while the view is not the default; on a phone it is a native header item.
 */
export function SessionsFilterMenu(
  props: SessionsFilterMenuProps,
): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={filterLabel}
      groups={sessionsViewGroups.map((group) => viewGroup(group, props))}
      actions={[resetAction(props)]}
      trigger={filterTriggers(!isDefaultSessionsView(props.view))}
    />
  );
}
