// iOS draws the Screen's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import {
  splitHeaderActions,
  type ActionGroup,
} from '#primitives/actions/action-list';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';
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
      <HeaderItems {...props} declared={groups} label={label} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
  );
}

type HeaderProps = ScreenProps & { declared: ActionGroup[]; label: string };

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems(props: HeaderProps): ReactElement {
  const primary = screenPrimaryAction(props);

  const { direct, overflow } = splitHeaderActions(
    props.declared,
    primary ? 1 : 2,
  );

  const entry = toolbarEntry(useNativeTheme().colors.primary);

  return (
    <Stack.Toolbar placement="right">
      {direct.map(entry)}
      {overflowMenu(overflow, props.label)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}
