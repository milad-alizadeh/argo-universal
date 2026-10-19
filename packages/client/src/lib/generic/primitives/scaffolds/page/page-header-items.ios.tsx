// iOS draws the Page's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import {
  ActionListHeaderContext,
  type DeclaredAction,
} from '#primitives/actions/action-list';
import { headerActions } from './page-action-groups';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import { overflowMenu, toolbarButton } from './page-toolbar-items.ios';
import { usePageActions } from './use-page-actions';

export const pageTitleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

export function PageHeaderItems(props: PageProps): ReactElement {
  const { register, actions, label } = usePageActions();

  return (
    <ActionListHeaderContext value={register}>
      {props.actions}
      <HeaderItems {...props} declared={actions} label={label} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </ActionListHeaderContext>
  );
}

type HeaderProps = PageProps & { declared: DeclaredAction[]; label: string };

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems(props: HeaderProps): ReactElement {
  const primary = props.primaryAction;
  const { direct, overflow } = headerActions(props.declared, primary ? 1 : 2);

  return (
    <Stack.Toolbar placement="right">
      {direct.map(toolbarButton)}
      {overflowMenu(overflow, props.label)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}
