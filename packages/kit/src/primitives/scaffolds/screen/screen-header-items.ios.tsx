// iOS draws the Screen's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { iconSymbols } from '#kit/symbols/icon-names';
import { screenHeader, type ScreenHeader } from '#primitives/actions/action';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.ios';
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
  const header = screenHeader(props.declaration, 'ios');

  if (header.selecting) return null;

  return (
    <>
      <MenuItem />
      <HeaderItems header={header} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
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

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems({ header }: { header: ScreenHeader }): ReactElement {
  const entry = toolbarEntry(useNativeTheme().colors.primary);
  const { primary } = header;

  return (
    <Stack.Toolbar placement="right">
      {header.direct.map(entry)}
      {overflowMenu(header.overflow, header.label)}
      {selectItem(header.select)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}

// Select is a stock bar button of its own: the stack sizes it, and it ends the bar's items before the primary Action.
function selectItem(select: ScreenHeader['select']): ReactElement | null {
  if (!select) return null;

  return toolbarButton({ id: 'select', label: 'Select', onPress: select });
}
