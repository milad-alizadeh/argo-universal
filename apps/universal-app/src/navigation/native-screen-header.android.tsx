import { DockedSearch, type ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';

// Android keeps the toolbar to its title and items; Material's docked search bar sits under it.
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
        }}
      />
      {search && <DockedSearch search={search} />}
    </>
  );
}
