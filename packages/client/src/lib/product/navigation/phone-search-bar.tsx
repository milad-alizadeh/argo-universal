import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';

// iOS 26 docks the search bar at the bottom.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

interface PhoneSearchBarProps {
  placeholder: string;
  onSearch: (search: string) => void;
  // A stock item beside the docked bar on iOS 26, in its own bubble, such as New Session.
  dockedAction?: ReactNode;
}

/*
 * A phone header's search: the stack's own search bar. iOS 26 docks it at the bottom, in the thumb's reach; earlier
 * iOS stacks it below the header row, since an integrated bar there falls back to inline and squeezes the title.
 * A wide window searches in the page instead.
 */
export function PhoneSearchBar(
  props: PhoneSearchBarProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      {searchBar(props)}
      {bottomSearch ? bottomToolbar(props.dockedAction) : null}
    </>
  );
}

const searchBarPlacement = {
  autoCapitalize: 'none',
  hideWhenScrolling: false,
  placement: hasLiquidGlass ? 'integrated' : 'stacked',
  hideNavigationBar: hasLiquidGlass,
} as const;

// Closing or cancelling the search bar clears the query.
function searchBar({
  placeholder,
  onSearch,
}: PhoneSearchBarProps): React.JSX.Element {
  return (
    <Stack.SearchBar
      placeholder={placeholder}
      {...searchBarPlacement}
      onChangeText={(event) => onSearch(event.nativeEvent.text)}
      onCancelButtonPress={() => onSearch('')}
      onClose={() => onSearch('')}
    />
  );
}

// A flexible spacer keeps the action beside the bar in its own bubble rather than inside the field.
function bottomToolbar(action: ReactNode): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      {action ? <Stack.Toolbar.Spacer /> : null}
      {action}
    </Stack.Toolbar>
  );
}
