import type { ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';
import { screenHeaderOptions } from './screen-header-options';

// Android keeps the toolbar to its title and items; a list draws its own search bar at its top, scrolling with it.
export function NativeScreenHeader({
  right = [],
  ...header
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <Stack.Screen
      options={{ ...screenHeaderOptions(header), ...rightItems(right) }}
    />
  );
}
