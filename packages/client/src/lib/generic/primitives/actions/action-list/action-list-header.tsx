import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/actions/icon-button';
import { ItemBadge } from '#primitives/lists/list-item';
import { Menu, type MenuEntry } from '#primitives/overlays/menu';
import {
  submenuGroups,
  isSubmenu,
  type ActionGroup,
  type DeclaredEntry,
  type DeclaredSubmenu,
} from './action-declarations';
import {
  splitHeaderActions,
  type HeaderEntry,
  type IconAction,
} from './header-actions';
import { submenuCountText, submenuLabel } from './submenu-badge';

export interface HeaderActionsProps {
  // Ordered by `orderedGroups`.
  groups: ActionGroup[];
  label: string;
  // How many controls the header has room for, the overflow button included.
  slots: number;
}

export interface HeaderOverflowProps {
  groups: ActionGroup[];
  label: string;
}

// A header's Actions as Argo-drawn buttons and menus where Argo draws the heading; a phone's native header uses stock items.
export function HeaderActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props.groups, props.slots);

  return (
    <View className="flex-row items-center gap-1">
      {direct.map(headerEntry)}
      <HeaderOverflow groups={overflow} label={props.label} />
    </View>
  );
}

function headerEntry(entry: HeaderEntry): ReactElement {
  if (isSubmenu(entry)) return <HeaderSubmenu key={entry.id} submenu={entry} />;

  return <HeaderAction key={entry.id} action={entry} />;
}

/*
 * Each group's first entry starts a Section, so the menu keeps the Sections' titles and separators; a submenu keeps
 * its label and icon and nests its own Sections.
 */
export function headerMenuActions(groups: ActionGroup[]): MenuEntry[] {
  return groups.flatMap((group) =>
    group.actions.map((entry, index) => ({
      ...menuEntry(entry),
      section: index === 0 ? { title: group.title } : undefined,
    })),
  );
}

// A folded submenu's row keeps its count after the label and in its spoken name.
function menuEntry(entry: DeclaredEntry): MenuEntry {
  if (!isSubmenu(entry)) return entry;

  return {
    id: entry.id,
    label: entry.label,
    accessibilityLabel: submenuLabel(entry),
    icon: entry.icon,
    count: submenuCountText(entry.badge),
    actions: headerMenuActions(submenuGroups(entry)),
  };
}

interface ActionMenuProps extends HeaderOverflowProps {
  trigger: ReactElement;
}

// The one header menu: the overflow's and each submenu's.
function ActionMenu(props: ActionMenuProps): ReactElement {
  return (
    <Menu
      accessibilityLabel={props.label}
      trigger={props.trigger}
      actions={headerMenuActions(props.groups)}
    />
  );
}

// Android's overflow menu opens from vertical dots, as its stock toolbar's does.
export const overflowIcon = {
  sf: 'ellipsis',
  material: 'more_vert',
} satisfies IconButtonProps['icon'];

function HeaderOverflow({
  groups,
  label,
}: HeaderOverflowProps): ReactElement | null {
  if (!groups.length) return null;

  const trigger = headerButton(overflowIcon, label);

  return <ActionMenu groups={groups} label={label} trigger={trigger} />;
}

// A submenu opens its own Sections from its icon, its badge on the icon.
function HeaderSubmenu({
  submenu,
}: {
  submenu: DeclaredSubmenu;
}): ReactElement {
  const label = submenuLabel(submenu);
  const badge = submenu.badge && <ItemBadge badge={submenu.badge} />;

  return (
    <ActionMenu
      groups={submenuGroups(submenu)}
      label={label}
      trigger={headerButton(submenu.icon, label, badge)}
    />
  );
}

function HeaderAction({ action }: { action: IconAction }): ReactElement {
  return (
    <IconButton
      icon={action.icon}
      iconRole="action"
      accessibilityLabel={action.label}
      disabled={action.disabled}
      onPress={action.onPress}
      variant="ghost"
    />
  );
}

function headerButton(
  icon: IconButtonProps['icon'],
  label: string,
  badge?: ReactElement,
): ReactElement {
  return (
    <IconButton
      icon={icon}
      iconRole="action"
      accessibilityLabel={label}
      variant="ghost"
      badge={badge}
    />
  );
}
