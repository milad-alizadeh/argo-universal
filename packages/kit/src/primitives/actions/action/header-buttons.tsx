import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonSize,
} from '#primitives/actions/icon-button';
import {
  submenuGroups,
  isSubmenu,
  type ActionGroup,
  type DeclaredSubmenu,
} from './action-declarations';
import {
  splitHeaderActions,
  type HeaderEntry,
  type IconAction,
} from './header-actions';
import { ActionMenu, overflowIcon } from './header-menu';
import { HeaderTrigger } from './header-trigger';
import { submenuLabel } from './submenu-badge';

export interface HeaderActionsProps {
  // Ordered by `orderedGroups`.
  groups: ActionGroup[];
  label: string;
  // How many controls the header has room for, the overflow button included.
  slots: number;
  // The kit's button size; a list column's heading draws smaller buttons than a page's.
  size?: IconButtonSize;
}

interface SizedProps {
  size?: IconButtonSize;
}

// A header's Actions as Argo-drawn buttons and menus where Argo draws the heading; a phone's native header uses stock items.
export function HeaderActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props.groups, props.slots);
  const { size } = props;

  return (
    <View className="flex-row items-center gap-1">
      {direct.map((entry) => headerEntry(entry, size))}
      <HeaderOverflow groups={overflow} label={props.label} size={size} />
    </View>
  );
}

function headerEntry(entry: HeaderEntry, size?: IconButtonSize): ReactElement {
  if (isSubmenu(entry))
    return <HeaderSubmenu key={entry.id} submenu={entry} size={size} />;

  return <HeaderAction key={entry.id} action={entry} size={size} />;
}

function HeaderOverflow(
  props: SizedProps & { groups: ActionGroup[]; label: string },
): ReactElement | null {
  if (!props.groups.length) return null;

  const { label, size } = props;
  const icon = overflowIcon;

  return (
    <ActionMenu
      groups={props.groups}
      label={label}
      trigger={<HeaderTrigger icon={icon} label={label} size={size} />}
    />
  );
}

// A submenu opens its own Sections from its icon, its badge at the icon's corner.
function HeaderSubmenu(
  props: SizedProps & { submenu: DeclaredSubmenu },
): ReactElement {
  const { submenu } = props;

  return (
    <ActionMenu
      groups={submenuGroups(submenu)}
      label={submenuLabel(submenu)}
      trigger={submenuTrigger(props)}
    />
  );
}

function submenuTrigger(
  props: SizedProps & { submenu: DeclaredSubmenu },
): ReactElement {
  const { icon, badge } = props.submenu;
  const label = submenuLabel(props.submenu);

  return (
    <HeaderTrigger icon={icon} badge={badge} label={label} size={props.size} />
  );
}

function HeaderAction(
  props: SizedProps & { action: IconAction },
): ReactElement {
  const { action } = props;

  return (
    <IconButton
      icon={action.icon}
      accessibilityLabel={action.label}
      disabled={action.disabled}
      onPress={action.onPress}
      size={props.size}
      variant="ghost"
    />
  );
}
