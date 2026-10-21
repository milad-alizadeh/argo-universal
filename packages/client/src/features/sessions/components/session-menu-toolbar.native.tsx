import { SizeClass } from '@repo/kit/size-class/size-class';
import fileDiff from '@repo/kit/symbols/assets/file-diff.xml';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { toolbarIcon } from '../../../lib/product/navigation/toolbar-icon';
import { type SessionMenuItem, sessionMenuItems } from './session-menu-items';
import type { SessionMenuToolbarProps } from './session-menu-toolbar';

/*
 * A phone's Session header: the stock ⋯ item opens changed files, Rename and Archive in the
 * system's own menu: a SwiftUI pull-down on iOS, Compose's DropdownMenu on Android. A wide window's page header
 * draws ⋯ itself.
 */
export function SessionMenuToolbar({
  menu,
}: SessionMenuToolbarProps): React.JSX.Element | null {
  const items = sessionMenuItems(menu);

  if (items.length === 0) return null;

  return (
    <SizeClass only="compact">
      <Stack.Toolbar placement="right">{moreMenu(items)}</Stack.Toolbar>
    </SizeClass>
  );
}

function moreMenu(items: SessionMenuItem[]): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu icon={toolbarIcon('more')} accessibilityLabel="More">
      {items.map(menuAction)}
    </Stack.Toolbar.Menu>
  );
}

function menuAction(item: SessionMenuItem): React.JSX.Element {
  if (item.icon === 'diff') return changesMenuAction({ item });

  return namedMenuAction({ item, icon: item.icon });
}

const changesMenuIcon =
  process.env.EXPO_OS === 'android' ? fileDiff : undefined;

type MenuActionProps = { item: SessionMenuItem };

function changesMenuAction({ item }: MenuActionProps): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction
      key={item.label}
      icon={changesMenuIcon}
      onPress={item.onPress}
    >
      <Stack.Toolbar.Icon xcasset="custom.file-diff" />
      <Stack.Toolbar.Label>{item.label}</Stack.Toolbar.Label>
    </Stack.Toolbar.MenuAction>
  );
}

type NamedMenuActionProps = MenuActionProps & { icon: 'rename' | 'archive' };

function namedMenuAction({
  item,
  icon,
}: NamedMenuActionProps): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction
      key={item.label}
      icon={toolbarIcon(icon)}
      disabled={item.disabled}
      onPress={item.onPress}
    >
      {item.label}
    </Stack.Toolbar.MenuAction>
  );
}
