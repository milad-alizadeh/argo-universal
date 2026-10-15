import { Stack } from 'expo-router';
import type * as React from 'react';
import type { MenuAction } from '#primitives/overlays/menu';
import type { HeaderItem } from './header-items';
import { toolbarIcon } from './toolbar-icon';

type Placement = 'left' | 'right';

/*
 * A stack header's items as stock bar button items (Stack.Toolbar): the system draws, sizes, hit-tests and places each
 * one like the back chevron. The result goes straight into a page, or into a layout's `Stack.Screen`, which reads it by type.
 */
export function headerToolbar(
  placement: Placement,
  items: readonly HeaderItem[],
): React.JSX.Element | null {
  if (!items.length) return null;

  return (
    <Stack.Toolbar key={placement} placement={placement}>
      {items.map((item) => toolbarItem(item, placement === 'right'))}
    </Stack.Toolbar>
  );
}

// One stock item; a separate one keeps its own glass bubble on iOS 26.
export function toolbarItem(
  item: HeaderItem,
  separate: boolean,
): React.JSX.Element {
  const { menu, onPress } = item;
  const parts = itemParts(item, separate);

  return menu ? toolbarMenu(parts, menu) : toolbarButton({ ...parts, onPress });
}

const itemParts = (
  { icon, accessibilityLabel, dot }: HeaderItem,
  separate: boolean,
): ToolbarItemParts => ({
  key: accessibilityLabel,
  icon: toolbarIcon(icon),
  accessibilityLabel,
  separateBackground: separate,
  badge: toolbarBadge(dot),
});

interface ToolbarItemParts {
  key: string;
  icon: ReturnType<typeof toolbarIcon>;
  accessibilityLabel: string;
  separateBackground: boolean;
  badge: React.JSX.Element | null;
  onPress?: () => void;
}

function toolbarButton({
  key,
  badge,
  ...props
}: ToolbarItemParts): React.JSX.Element {
  return (
    <Stack.Toolbar.Button key={key} {...props}>
      {badge}
    </Stack.Toolbar.Button>
  );
}

function toolbarMenu(
  { key, badge, ...props }: ToolbarItemParts,
  menu: readonly MenuAction[],
): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu key={key} {...props}>
      {badge}
      {menu.map(menuChoice)}
    </Stack.Toolbar.Menu>
  );
}

function menuChoice({
  label,
  selected,
  onPress,
}: MenuAction): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction key={label} isOn={selected} onPress={onPress}>
      {label}
    </Stack.Toolbar.MenuAction>
  );
}

/*
 * The item's dot as the platform's stock badge: Material's empty badge on Android; on iOS 26 the bar button item's
 * badge (UIBarButtonItemBadge), for attention only, since a filter's state shows checked in its own menu. iOS 18 has no
 * bar button item badge.
 */
const badgedDots: readonly HeaderItem['dot'][] =
  process.env.EXPO_OS === 'android' ? ['attention', 'filter'] : ['attention'];

function toolbarBadge(dot: HeaderItem['dot']): React.JSX.Element | null {
  return dot && badgedDots.includes(dot) ? <Stack.Toolbar.Badge /> : null;
}
