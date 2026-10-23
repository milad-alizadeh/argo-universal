import { Stack } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { isCustomSymbol } from '#kit/symbols/custom-symbols';
import { resolveIcon } from '#kit/symbols/icon-symbol';
import {
  isSubmenu,
  submenuBadgeText,
  submenuCountText,
  submenuGroups,
  type ActionGroup,
  type ActionProps,
  type DeclaredAction,
  type DeclaredEntry,
  type DeclaredSubmenu,
} from '#primitives/actions/action-list';
import { countedTitle } from '#primitives/overlays/menu';

type ToolbarButton = ComponentProps<typeof Stack.Toolbar.Button>;

// Template rendering tints image icons (custom symbols) like SF Symbols, in light and dark.
const tinted = { iconRenderingMode: 'template' } as const;

// An overflow menu row may have no icon.
function toolbarIcon(
  icon: ActionProps['icon'],
): SFSymbol | ImageSourcePropType | undefined {
  return icon ? symbolSource(icon) : undefined;
}

function symbolSource(
  icon: NonNullable<ActionProps['icon']>,
): SFSymbol | ImageSourcePropType | undefined {
  const source = resolveIcon(icon).symbol;

  // An SVG symbol has no image the system toolbar can draw, so its button shows only its label.
  if ('svg' in source) return undefined;

  if (isCustomSymbol(source.sf)) return { uri: source.sf };

  return source.sf;
}

function toolbarAction(action: DeclaredAction): ToolbarButton {
  return {
    ...tinted,
    icon: toolbarIcon(action.icon),
    accessibilityLabel: action.label,
    children: action.label,
    disabled: action.disabled,
    onPress: action.onPress,
  };
}

export function toolbarButton(action: DeclaredAction): ReactElement {
  return <Stack.Toolbar.Button key={action.id} {...toolbarAction(action)} />;
}

// A status dot takes Argo's primary colour, which only a component resolves; a count keeps the stock badge.
export const toolbarEntry =
  (dotColor: string | undefined) =>
  (entry: DeclaredEntry): ReactElement =>
    isSubmenu(entry) ? toolbarSubmenu(entry, dotColor) : toolbarButton(entry);

/*
 * A submenu is a bar item of its own, apart from the others' background, its badge on the icon; its Sections draw as
 * the overflow menu's do.
 */
function toolbarSubmenu(
  submenu: DeclaredSubmenu,
  dotColor: string | undefined,
): ReactElement {
  return (
    <Stack.Toolbar.Menu key={submenu.id} {...submenuItem(submenu)}>
      {toolbarBadge(submenuBadgeText(submenu.badge), dotColor)}
      {menuSections(submenuGroups(submenu))}
    </Stack.Toolbar.Menu>
  );
}

const submenuItem = (submenu: DeclaredSubmenu) =>
  ({
    ...tinted,
    icon: toolbarIcon(submenu.icon),
    accessibilityLabel: submenu.label,
    separateBackground: true,
  }) as const;

// Stack.Toolbar.Badge shows its text, or a dot with none; only a root item in the left or right toolbar draws it.
function toolbarBadge(
  text: string | undefined,
  dotColor: string | undefined,
): ReactElement | null {
  if (text === undefined) return null;

  return text ? (
    <Stack.Toolbar.Badge>{text}</Stack.Toolbar.Badge>
  ) : (
    <Stack.Toolbar.Badge style={{ backgroundColor: dotColor }} />
  );
}

export function overflowMenu(
  groups: ActionGroup[],
  label: string,
): ReactElement | null {
  if (!groups.length) return null;

  return (
    <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel={label}>
      {menuSections(groups)}
    </Stack.Toolbar.Menu>
  );
}

// One untitled group needs no section; otherwise each group is a section, as the web overflow menu shows it.
function menuSections(groups: ActionGroup[]): ReactElement[] {
  const plain = singleUntitled(groups);

  if (plain) return plain.actions.map(menuEntry);

  return groups.map(menuSection);
}

function singleUntitled(groups: ActionGroup[]): ActionGroup | undefined {
  if (groups.length !== 1) return undefined;

  return groups.find((group) => !group.title);
}

// An `inline` submenu draws in place as a section of its parent menu, under its `title` when it has one.
function menuSection(group: ActionGroup): ReactElement {
  return (
    <Stack.Toolbar.Menu
      key={`section/${group.actions[0]?.id}`}
      inline
      title={group.title}
    >
      {group.actions.map(menuEntry)}
    </Stack.Toolbar.Menu>
  );
}

function menuEntry(entry: DeclaredEntry): ReactElement {
  return isSubmenu(entry) ? nestedSubmenu(entry) : menuAction(entry);
}

/*
 * In the overflow menu a submenu is a nested UIMenu: a row under its `title` and icon that opens its Sections. A
 * nested header menu takes only a title and an icon (react-native-screens' HeaderBarButtonItemSubmenu), so the title
 * carries the count.
 */
function nestedSubmenu(submenu: DeclaredSubmenu): ReactElement {
  const count = submenuCountText(submenu.badge);

  return (
    <Stack.Toolbar.Menu
      key={submenu.id}
      {...tinted}
      icon={toolbarIcon(submenu.icon)}
      title={countedTitle(submenu.label, count)}
    >
      {menuSections(submenuGroups(submenu))}
    </Stack.Toolbar.Menu>
  );
}

function menuAction(action: DeclaredAction): ReactElement {
  const props = {
    ...tinted,
    icon: toolbarIcon(action.icon),
    onPress: action.onPress,
    disabled: action.disabled,
    destructive: action.tone === 'danger',
    // A choice's check: UIMenu's on state.
    isOn: action.selected,
  };

  return (
    <Stack.Toolbar.MenuAction key={action.id} {...props}>
      {action.label}
    </Stack.Toolbar.MenuAction>
  );
}
