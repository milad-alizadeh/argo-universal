import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import type { PageProps } from './page-props';
import { docksSearch } from './page-search-placement';
import { toolbarAction } from './page-toolbar-items.ios';
import { usePageSearchBar } from './use-page-search-bar';

const placement = {
  placement: docksSearch ? 'integrated' : 'stacked',
  hideNavigationBar: docksSearch,
  hideWhenScrolling: false,
  autoCapitalize: 'none',
} as const;

export function PageSearchBar(props: PageProps): ReactElement {
  return (
    <>
      <Stack.SearchBar {...usePageSearchBar(props)} {...placement} />
      {docksSearch ? bottomToolbar(props.primaryAction) : null}
    </>
  );
}

function bottomToolbar(action: PageProps['primaryAction']): ReactElement {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      {action ? <Stack.Toolbar.Spacer /> : null}
      {action ? (
        <Stack.Toolbar.Button {...toolbarAction(action)} separateBackground />
      ) : null}
    </Stack.Toolbar>
  );
}
