import { HeaderSearchBar, type ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';

// With search, Material's search bar takes the title's place; the leading and trailing items stay.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLeft: left ? () => left : undefined,
        ...(search
          ? { headerTitle: () => <HeaderSearchBar search={search} /> }
          : {}),
        ...rightItems(right),
      }}
    />
  );
}
