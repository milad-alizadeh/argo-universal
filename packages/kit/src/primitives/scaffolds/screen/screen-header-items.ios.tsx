// iOS draws the Screen's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { iconSymbols } from '#kit/symbols/icon-names';
import type { ActionGroup, ScreenHeader } from '#primitives/actions/action';
import { useScreenMenu } from './screen-menu-context';
import { toolbarOptionsButton } from './screen-options-item.ios';
import type { PageOptions, ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.ios';
import { TitleMenu } from './screen-title-menu';
import {
  overflowMenu,
  toolbarButton,
  toolbarEntry,
} from './screen-toolbar-items.ios';

export const screenTitleOptions = {
  headerTitleAlign: 'center',
  headerLargeTitleEnabled: false,
} as const;

// A selecting List's header replaces the whole stack header, so none of these items are drawn meanwhile.
export function ScreenHeaderItems(
  props: ScreenHeaderInput,
): ReactElement | null {
  const header = props.headers.native;

  if (header.selecting) return null;

  return (
    <>
      <TitleItem title={props.title} groups={props.titleGroups} />
      <MenuItem />
      <HeaderItems header={header} options={props.pageOptions} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
  );
}

// A narrow root, which ☰ opens from, has the system's large title; pushed pages keep the inline one.
function RootTitle(): ReactElement | null {
  if (useScreenMenu() === null) return null;

  return <Stack.Screen options={{ headerLargeTitleEnabled: true }} />;
}

type TitleProps = { title?: string; groups: ActionGroup[] };

/*
 * A title with a menu draws in the bar's title place as the menu's button, inline: a large title is UIKit's own text
 * and could not open the menu.
 */
function TitleItem(props: TitleProps): ReactElement | null {
  if (!props.groups.length) return <RootTitle />;

  return <TitleMenuItem {...props} />;
}

function TitleMenuItem({ title, groups }: TitleProps): ReactElement | null {
  if (!title) return null;

  const headerTitle = (): ReactElement => (
    <TitleMenu title={title} level={1} groups={groups} />
  );

  return (
    <Stack.Screen options={{ headerTitle, headerLargeTitleEnabled: false }} />
  );
}

// A narrow root leads with ☰ as a stock bar button item, which the system places like the back chevron, with the stock badge.
function MenuItem(): ReactElement | null {
  const menu = useScreenMenu();

  if (!menu) return null;

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        icon={iconSymbols.menu.sf}
        accessibilityLabel="Open navigation"
        onPress={menu.onOpen}
      >
        {menu.badge ? <Stack.Toolbar.Badge /> : null}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is; the page's Options come first.
type HeaderItemsProps = { header: ScreenHeader; options: PageOptions | null };

function HeaderItems({ header, options }: HeaderItemsProps): ReactElement {
  const dotColor = useNativeTheme().colors.primary;

  return (
    <Stack.Toolbar placement="right">
      {options ? toolbarOptionsButton(options, dotColor) : null}
      {header.direct.map(toolbarEntry(dotColor))}
      {overflowMenu(header.overflow, header.label)}
      {selectItem(header.select)}
      {primaryItem(header.primary)}
    </Stack.Toolbar>
  );
}

function primaryItem(primary: ScreenHeader['primary']): ReactElement | null {
  return primary ? toolbarButton({ ...primary, id: 'primary' }) : null;
}

// Select is a stock bar button of its own: the stack sizes it, and it ends the bar's items before the primary Action.
function selectItem(select: ScreenHeader['select']): ReactElement | null {
  if (!select) return null;

  return toolbarButton({ id: 'select', label: 'Select', onPress: select });
}
