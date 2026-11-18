// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  isSubmenu,
  type ActionGroup,
  type HeaderEntry,
  type ScreenHeader,
} from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ScreenActionButton } from './screen-action-button.android';
import { drawerLeading } from './screen-drawer-button';
import {
  ScreenOptionsButton,
  ScreenOverflowButton,
  ScreenSubmenuButton,
} from './screen-menu-button.android';
import { useScreenMenu } from './screen-menu-context';
import type { PageOptions, ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.android';
import { TitleMenu } from './screen-title-menu';

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

  const headerRight = (): ReactElement => (
    <ToolbarActions header={header} options={props.pageOptions} />
  );

  const title = titleOf(props.titleGroups);

  return (
    <>
      <Stack.Screen options={toolbarOptions({ headerRight, title, leading })} />
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

type TitleDrawing = (props: { children?: string }) => ReactElement;

// A title with a menu is the menu's button, opening the stock DropdownMenu below it, as the header's own menus do.
function titleOf(groups: ActionGroup[]): TitleDrawing {
  if (!groups.length) return ToolbarTitle;

  return function ToolbarTitleMenu(props) {
    return <TitleMenu title={props.children ?? ''} level={1} groups={groups} />;
  };
}

const toolbarOptions = (parts: {
  headerRight: () => ReactElement;
  title: TitleDrawing;
  leading: ReturnType<typeof drawerLeading>;
}): NativeStackNavigationOptions => ({
  headerRight: parts.headerRight,
  headerTitle: parts.title,
  ...parts.leading,
});

// The page's Options, direct Actions, submenus and the overflow menu are all stock Compose icon buttons, the menus stock DropdownMenus.
function ToolbarActions({
  header,
  options,
}: {
  header: ScreenHeader;
  options: PageOptions | null;
}): ReactElement {
  return (
    <View className="flex-row items-center">
      {options ? <ScreenOptionsButton options={options} /> : null}
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
