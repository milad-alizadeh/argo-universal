import type { ScreenHeaderProps } from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import type * as React from 'react';
import { sectionHeaderOptions } from './section-header-options';

// The drawer's own stock toggle, as the stack header's leading item.
const drawerToggle: NativeStackNavigationOptions['headerLeft'] = ({
  tintColor,
}) => <DrawerToggleButton tintColor={tintColor} />;

// An iOS section root's header is its stack's native one, so it keeps Liquid Glass and the native search: the drawer's stock toggle, the title, the trailing items and the search.
export function RootStackHeader(header: ScreenHeaderProps): React.JSX.Element {
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        headerLeft: drawerToggle,
        ...sectionHeaderOptions(header),
      }}
    />
  );
}
