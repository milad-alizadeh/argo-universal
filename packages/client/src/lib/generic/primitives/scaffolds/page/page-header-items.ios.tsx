// iOS draws the Page's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import {
  ActionListHeaderContext,
  splitHeaderActions,
  type ActionGroup,
} from '#primitives/actions/action-list';
import { pagePrimaryAction } from './page-primary-action';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import {
  overflowMenu,
  toolbarButton,
  toolbarEntry,
} from './page-toolbar-items.ios';
import { usePageActions } from './use-page-actions';

export const pageTitleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

export function PageHeaderItems(props: PageProps): ReactElement {
  const { register, groups, label } = usePageActions();

  return (
    <ActionListHeaderContext value={register}>
      {props.actions}
      <HeaderItems {...props} declared={groups} label={label} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </ActionListHeaderContext>
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

  return (
    <Stack.Toolbar placement="right">
      {direct.map(toolbarEntry)}
      {overflowMenu(overflow, props.label)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}
