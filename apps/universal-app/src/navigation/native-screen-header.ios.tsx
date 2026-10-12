import { hasLiquidGlass, type ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';
import { headerSearchOptions } from './header-search-options';

// iOS draws the native search bar; iOS 26 docks it at the bottom, in the thumb's reach.
// Before iOS 26 an integrated bar falls back to inline and squeezes the title, so it stacks below the header row.
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
          headerSearchBarOptions: search && {
            ...headerSearchOptions(search),
            placement: hasLiquidGlass ? 'integrated' : 'stacked',
          },
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
