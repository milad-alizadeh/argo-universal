import { Stack } from 'expo-router';
import type * as React from 'react';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import { toolbarIcon } from '../../../lib/product/navigation/toolbar-icon';
import { type SessionMenuItem, sessionMenuItems } from './session-menu-items';
import type { SessionMenuToolbarProps } from './session-menu-toolbar';

/*
 * A phone's Session header: the stock ⋯ item opens Rename and Archive, as the Session's row offers them, in the
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
  return (
    <Stack.Toolbar.MenuAction
      key={item.label}
      icon={toolbarIcon(item.icon)}
      disabled={item.disabled}
      onPress={item.onPress}
    >
      {item.label}
    </Stack.Toolbar.MenuAction>
  );
}
