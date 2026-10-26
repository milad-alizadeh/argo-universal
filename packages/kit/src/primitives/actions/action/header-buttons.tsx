import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { IconSymbol } from '#kit/symbols/icon-symbol';
import {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
} from '#primitives/actions/icon-button';
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

// How a header draws its buttons: their size, and what each one's spoken name says it acts on.
export interface HeaderButtonLook {
  size?: IconButtonSize;
  /*
   * The name of what the Actions act on, such as a section's title, spoken after each button's label so repeated
   * headers keep distinct names; the visible label and the menus keep the label alone.
   */
  subject?: string;
}

export interface HeaderActionsProps {
  // Ordered by `orderedGroups`.
  groups: ActionGroup[];
  label: string;
  // How many controls the header has room for, the overflow button included.
  slots: number;
  look?: HeaderButtonLook;
}

interface HeaderOverflowProps {
  groups: ActionGroup[];
  label: string;
  look: HeaderButtonLook;
}

// A header's Actions as Argo-drawn buttons and menus where Argo draws the heading; a phone's native header uses stock items.
export function HeaderActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props.groups, props.slots);
  const look = props.look ?? {};

  return (
    <View className="flex-row items-center gap-1">
      {direct.map((entry) => headerEntry(entry, look))}
      <HeaderOverflow groups={overflow} label={props.label} look={look} />
    </View>
  );
}

function headerEntry(entry: HeaderEntry, look: HeaderButtonLook): ReactElement {
  if (isSubmenu(entry))
    return <HeaderSubmenu key={entry.id} submenu={entry} look={look} />;

  return <HeaderAction key={entry.id} action={entry} look={look} />;
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

interface ActionMenuProps {
  groups: ActionGroup[];
  label: string;
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
} satisfies IconSymbol;

function HeaderOverflow({
  groups,
  label,
  look,
}: HeaderOverflowProps): ReactElement | null {
  if (!groups.length) return null;

  const trigger = headerButton(overflowIcon, label, look);

  return <ActionMenu groups={groups} label={label} trigger={trigger} />;
}

// A submenu opens its own Sections from its icon, its badge on the icon.
interface SubmenuProps {
  submenu: DeclaredSubmenu;
  look: HeaderButtonLook;
}

function HeaderSubmenu({ submenu, look }: SubmenuProps): ReactElement {
  const label = submenuLabel(submenu);

  return (
    <ActionMenu
      groups={submenuGroups(submenu)}
      label={label}
      trigger={headerButton(submenu.icon, label, look)}
    />
  );
}

interface ActionProps {
  action: IconAction;
  look: HeaderButtonLook;
}

function HeaderAction({ action, look }: ActionProps): ReactElement {
  return (
    <IconButton
      icon={action.icon}
      disabled={action.disabled}
      onPress={action.onPress}
      {...buttonProps(action.label, look)}
    />
  );
}

// Every header control is a ghost IconButton, at the size its header asks for, named for its subject when it has one.
const buttonProps = (
  label: string,
  { size, subject }: HeaderButtonLook,
): Pick<IconButtonProps, 'variant' | 'size' | 'accessibilityLabel'> => ({
  variant: 'ghost',
  size,
  accessibilityLabel: subject ? `${label}, ${subject}` : label,
});

function headerButton(
  icon: IconSymbol,
  label: string,
  look: HeaderButtonLook,
): ReactElement {
  return <IconButton icon={icon} {...buttonProps(label, look)} />;
}
