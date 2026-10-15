import { PhoneMenuButton, type ScreenHeaderProps } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import {
  DrawerToggleButton,
  type DrawerNavigationOptions,
} from 'expo-router/drawer';
import type * as React from 'react';
import { Platform } from 'react-native';
import { nativeHeaderOptions, webHeaderOptions } from './header-options';

// Android's section roots show the drawer's own header (Drawer `screenOptions`), with its stock DrawerToggleButton; iOS and the web show the section stack's header, so iOS keeps Liquid Glass and the native search.
const drawerDrawsRootHeader = Platform.OS === 'android';

// The drawer's own stock toggle, as the iOS stack header's leading item.
const drawerToggle: NativeStackNavigationOptions['headerLeft'] = ({
  tintColor,
}) => <DrawerToggleButton tintColor={tintColor} />;

// The narrow web header's own ☰.
const menuButton = (): React.JSX.Element => <PhoneMenuButton />;

// A narrow section root's options on its stack's `index` screen.
export function stackRootOptions(
  header: ScreenHeaderProps,
): NativeStackNavigationOptions {
  if (drawerDrawsRootHeader) return { headerShown: false };

  if (Platform.OS === 'ios')
    return { headerLeft: drawerToggle, ...nativeHeaderOptions(header) };

  return { headerLeft: menuButton, ...webHeaderOptions(header) };
}

// A narrow section root's options on its drawer screen, on Android: the drawer header draws ☰ and the title, with the root's trailing items and search.
export function drawerRootOptions(
  header: ScreenHeaderProps,
): DrawerNavigationOptions {
  return drawerDrawsRootHeader
    ? { headerShown: true, ...nativeHeaderOptions(header) }
    : { headerShown: false };
}
