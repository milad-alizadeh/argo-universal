// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  isSubmenu,
  splitHeaderActions,
  type HeaderActionsProps,
  type HeaderEntry,
} from '#primitives/actions/action';
import { ScreenActionButton } from './screen-action-button.android';
import { ScreenDrawerButton } from './screen-drawer-button';
import {
  ScreenOverflowButton,
  ScreenSubmenuButton,
} from './screen-menu-button.android';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.android';

export const screenTitleOptions = { headerTitleAlign: 'left' } as const;

// The toolbar draws its items outside the Screen's tree, so it draws the groups the Screen declared.
export function ScreenHeaderItems(props: ScreenHeaderInput): ReactElement {
  const { groups, label } = props.header;
  // The search icon takes one of the toolbar's two places.
  const options = headerOptions({ groups, label, slots: props.search ? 1 : 2 });
  const menu = useScreenMenu();
  // A narrow root leads with ☰ in the top app bar.
  const leading = menu
    ? { headerLeft: () => <ScreenDrawerButton menu={menu} /> }
    : {};

  return (
    <>
      <Stack.Screen options={{ ...options, ...leading }} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
  );
}

// A native stack's header and a drawer's both take the Actions as `headerRight`.
export interface HeaderRightOptions {
  headerRight: () => ReactElement;
}

export function headerOptions(header: HeaderActionsProps): HeaderRightOptions {
  return { headerRight: () => <ToolbarActions {...header} /> };
}

// Direct Actions, submenus and the overflow menu are all stock Compose icon buttons, the menus stock DropdownMenus.
function ToolbarActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props.groups, props.slots);

  return (
    <View className="flex-row items-center">
      {direct.map(toolbarEntry)}
      <ScreenOverflowButton groups={overflow} label={props.label} />
    </View>
  );
}

function toolbarEntry(entry: HeaderEntry): ReactElement {
  if (isSubmenu(entry))
    return <ScreenSubmenuButton key={entry.id} submenu={entry} />;

  return <ScreenActionButton key={entry.id} action={entry} />;
}
