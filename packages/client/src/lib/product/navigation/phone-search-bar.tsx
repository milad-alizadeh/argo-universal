import { Stack } from 'expo-router';
import type * as React from 'react';
import { type ComponentRef, type ReactNode, useRef } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { toolbarIcon } from './toolbar-icon';

// iOS 26 docks the search bar at the bottom.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

interface PhoneSearchBarProps {
  placeholder: string;
  onSearch: (search: string) => void;
  headerButton?: boolean;
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
  const ref = useRef<ComponentRef<typeof Stack.SearchBar>>(null);

  if (useWide()) return null;

  return (
    <>
      {headerSearchButton(props, ref)}
      {searchBar(props, ref)}
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
function searchBar(
  { placeholder, onSearch }: PhoneSearchBarProps,
  ref: React.RefObject<ComponentRef<typeof Stack.SearchBar> | null>,
): React.JSX.Element {
  return (
    <Stack.SearchBar
      ref={ref}
      placeholder={placeholder}
      {...searchBarPlacement}
      onChangeText={(event) => onSearch(event.nativeEvent.text)}
      onCancelButtonPress={() => onSearch('')}
      onClose={() => onSearch('')}
    />
  );
}

function headerSearchButton(
  props: PhoneSearchBarProps,
  ref: React.RefObject<ComponentRef<typeof Stack.SearchBar> | null>,
): React.JSX.Element | null {
  if (process.env.EXPO_OS !== 'ios' || !props.headerButton) return null;

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={toolbarIcon('search')}
        accessibilityLabel={props.placeholder}
        onPress={() => ref.current?.focus()}
      />
    </Stack.Toolbar>
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
