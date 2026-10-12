import { hasLiquidGlass, type ScreenHeaderProps } from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';

type Search = NonNullable<ScreenHeaderProps['search']>;

// iOS draws the native search bar; iOS 26 docks it at the bottom, in the thumb's reach.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLeft: left ? () => left : undefined,
          ...rightItems(right),
          headerSearchBarOptions: search ? searchBarOptions(search) : undefined,
        }}
      />
      {search && hasLiquidGlass && (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
        </Stack.Toolbar>
      )}
    </>
  );
}

function searchBarOptions(
  search: Search,
): NativeStackNavigationOptions['headerSearchBarOptions'] {
  return {
    placeholder: search.placeholder,
    placement: 'integrated',
    autoCapitalize: 'none',
    hideWhenScrolling: false,
    onChangeText: ({ nativeEvent }) => search.onChangeText(nativeEvent.text),
    onCancelButtonPress: () => search.onChangeText(''),
    onClose: () => search.onChangeText(''),
  };
}
