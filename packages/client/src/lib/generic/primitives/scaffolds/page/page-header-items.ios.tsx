// iOS draws the Page's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import {
  splitHeaderActions,
  type ActionGroup,
} from '#primitives/actions/action-list';
import { pagePrimaryAction } from './page-primary-action';
import type { PageHeaderInput, PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import {
  overflowMenu,
  toolbarButton,
  toolbarEntry,
} from './page-toolbar-items.ios';

export const pageTitleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

export function PageHeaderItems(props: PageHeaderInput): ReactElement {
  const { groups, label } = props.header;

  return (
    <>
      <HeaderItems {...props} declared={groups} label={label} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </>
  );
}

type HeaderProps = PageProps & { declared: ActionGroup[]; label: string };

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems(props: HeaderProps): ReactElement {
  const primary = pagePrimaryAction(props);

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
