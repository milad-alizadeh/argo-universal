import { type ScreenHeaderProps, useHeaderSearch } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';

// Search, last among the trailing items, opens a field in the title's place until Android adopts Material's search bar.
export function NativeScreenHeader({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const ownSearch = useHeaderSearch(search, right);
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLeft: left ? () => left : undefined,
        ...(ownSearch.field ? { headerTitle: () => ownSearch.field } : {}),
        ...rightItems(ownSearch.right),
      }}
    />
  );
}
