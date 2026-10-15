import { Stack } from 'expo-router';
import type * as React from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';

// iOS 26 docks the search bar at the bottom.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

interface PhoneSearchBarProps {
  placeholder: string;
  onSearch: (search: string) => void;
}

// A phone header's search: the stack's own search bar, docked at the bottom on iOS 26. A wide window searches in the page instead.
export function PhoneSearchBar(
  props: PhoneSearchBarProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      {searchBar(props)}
      {bottomSearch ? bottomToolbar : null}
    </>
  );
}

// Closing or cancelling the search bar clears the query.
function searchBar({
  placeholder,
  onSearch,
}: PhoneSearchBarProps): React.JSX.Element {
  return (
    <Stack.SearchBar
      placeholder={placeholder}
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
