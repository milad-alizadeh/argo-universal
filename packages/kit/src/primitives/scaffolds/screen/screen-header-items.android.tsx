// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  isSubmenu,
  type HeaderEntry,
  type ScreenHeader,
} from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ScreenActionButton } from './screen-action-button.android';
import { drawerLeading } from './screen-drawer-button';
import {
  ScreenOverflowButton,
  ScreenSubmenuButton,
} from './screen-menu-button.android';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.android';

export const screenTitleOptions = { headerTitleAlign: 'left' } as const;

/*
 * The toolbar draws its items outside the Screen's tree, so it draws the header the Screen declared. A selecting List's
 * header replaces the whole stack header, so none of these items are drawn meanwhile.
 */
export function ScreenHeaderItems(
  props: ScreenHeaderInput,
): ReactElement | null {
  const header = props.headers.native;
  const leading = drawerLeading(useScreenMenu());

  if (header.selecting) return null;

  const headerRight = (): ReactElement => <ToolbarActions header={header} />;

  return (
    <>
      <Stack.Screen options={toolbarOptions(headerRight, leading)} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
  );
}

/*
 * The toolbar's own title is a native TextView that grows little or not at all with the system font scale, while the
 * page's text and the root's heading do, so a pushed page's title is the kit's title Text, which scales with them.
 */
function ToolbarTitle(props: { children?: string }): ReactElement {
  return (
    <Text role="title" accessibilityRole="heading" numberOfLines={1}>
      {props.children}
    </Text>
  );
}

const toolbarOptions = (
  headerRight: () => ReactElement,
  leading: ReturnType<typeof drawerLeading>,
): NativeStackNavigationOptions => ({
  headerRight,
  headerTitle: ToolbarTitle,
  ...leading,
});

// Direct Actions, submenus and the overflow menu are all stock Compose icon buttons, the menus stock DropdownMenus.
function ToolbarActions({ header }: { header: ScreenHeader }): ReactElement {
  return (
    <View className="flex-row items-center">
      {header.direct.map(toolbarEntry)}
      <ScreenOverflowButton groups={header.overflow} label={header.label} />
    </View>
  );
}

function toolbarEntry(entry: HeaderEntry): ReactElement {
  if (isSubmenu(entry))
    return <ScreenSubmenuButton key={entry.id} submenu={entry} />;

  return <ScreenActionButton key={entry.id} action={entry} />;
}
