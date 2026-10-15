import { Stack } from 'expo-router';
import type * as React from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SearchedProps } from './project-list-props';
import { searchLabel } from './project-list-search';

// iOS 26 docks the search bar at the bottom.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

// A phone's native header: the stack's search bar; SettingsPage sets the title.
export function PhoneHeader({
  onSearch,
}: Pick<SearchedProps, 'onSearch'>): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      {searchBar(onSearch)}
      {bottomSearch ? bottomToolbar : null}
    </>
  );
}

// The stack's own search bar; closing or cancelling it clears the query.
function searchBar(onSearch: (search: string) => void): React.JSX.Element {
  return (
    <Stack.SearchBar
      placeholder={searchLabel}
      autoCapitalize="none"
      hideWhenScrolling={false}
      onChangeText={(event) => onSearch(event.nativeEvent.text)}
      onCancelButtonPress={() => onSearch('')}
      onClose={() => onSearch('')}
    />
  );
}

const bottomToolbar = (
  <Stack.Toolbar placement="bottom">
    <Stack.Toolbar.SearchBarSlot />
  </Stack.Toolbar>
);
