import { Stack } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import type { PageProps } from './page-props';
import { docksSearch } from './page-search-placement';
import { toolbarAction } from './page-toolbar-items.ios';

type SearchProps = {
  search: NonNullable<PageProps['search']>;
  action: PageProps['primaryAction'];
};

export function PageSearchBar({ search, action }: SearchProps): ReactElement {
  return (
    <>
      <Stack.SearchBar {...searchOptions(search)} />
      {docksSearch ? bottomToolbar(action) : null}
    </>
  );
}

function searchOptions(
  search: SearchProps['search'],
): ComponentProps<typeof Stack.SearchBar> {
  const clear = (): void => search.onChangeText?.('');

  return {
    placeholder: search.label,
    onChangeText: (event) => search.onChangeText?.(event.nativeEvent.text),
    onClose: clear,
    onCancelButtonPress: clear,
    placement: docksSearch ? 'integrated' : 'stacked',
    hideNavigationBar: docksSearch,
    hideWhenScrolling: false,
    autoCapitalize: 'none',
  };
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
