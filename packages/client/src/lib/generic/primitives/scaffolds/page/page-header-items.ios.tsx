// iOS draws the Page's Actions as UIKit bar items and its search as the stock search bar.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { headerActions } from './page-action-groups';
import type { PageHeaderInput } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import { overflowMenu, toolbarButton } from './page-toolbar-items.ios';

export const pageTitleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

export function PageHeaderItems(props: PageHeaderInput): ReactElement {
  return (
    <>
      <HeaderItems {...props} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </>
  );
}

// The primary Action sits top right on every iPhone and iPad, wherever the search bar is.
function HeaderItems(props: PageHeaderInput): ReactElement {
  const primary = props.primaryAction;
  const { actions, label } = props.header;
  const { direct, overflow } = headerActions(actions, primary ? 1 : 2);

  return (
    <Stack.Toolbar placement="right">
      {direct.map(toolbarButton)}
      {overflowMenu(overflow, label)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}
