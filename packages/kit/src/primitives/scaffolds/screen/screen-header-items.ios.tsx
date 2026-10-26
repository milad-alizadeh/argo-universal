// iOS draws the Screen's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { iconSymbols } from '#kit/symbols/icon-names';
import {
  splitHeaderActions,
  type ActionGroup,
} from '#primitives/actions/action';
import { useScreenMenu } from './screen-menu-context';
import { screenPrimaryAction } from './screen-primary-action';
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

export function ScreenHeaderItems(props: ScreenHeaderInput): ReactElement {
  const { groups, label } = props.header;

  return (
    <>
      <MenuItem />
      <HeaderItems {...props} declared={groups} label={label} />
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

type HeaderProps = ScreenHeaderInput & {
  declared: ActionGroup[];
  label: string;
};

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems(props: HeaderProps): ReactElement {
  const primary = screenPrimaryAction(props);

  const { direct, overflow } = headerEntries(props, Boolean(primary));

  const entry = toolbarEntry(useNativeTheme().colors.primary);

  return (
    <Stack.Toolbar placement="right">
      {direct.map(entry)}
      {overflowMenu(overflow, props.label)}
      {selectItem(props)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}

// Select is a stock bar button of its own: the stack sizes it, and it ends the bar's items before the primary Action.
function selectItem(props: ScreenHeaderInput): ReactElement | null {
  const begin = props.selectionMode?.begin;

  if (!begin) return null;

  return toolbarButton({ id: 'select', label: 'Select', onPress: begin });
}

function headerEntries(
  props: HeaderProps,
  primary: boolean,
): ReturnType<typeof splitHeaderActions> {
  return splitHeaderActions(props.declared, primary ? 1 : 2);
}
