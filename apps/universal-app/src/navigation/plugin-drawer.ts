import { pluginAt, type PluginSection } from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import type { ParamListBase, RouteProp } from 'expo-router/react-navigation';
import {
  drawerRootOptions,
  drawerScreenOptions,
  stackOwnsHeader,
} from './section-drawer-options';

type PluginLocation = { plugins: readonly PluginSection[]; path: string };

export const frameDrawerOptions =
  (framed: boolean, sections: PluginLocation) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions => {
    if (route.name === 'plugins') return pluginDrawerOptions(framed, sections);

    return drawerScreenOptions(framed)({ route });
  };

// A Plugin's pages draw their own headers, as a section's do; only its root keeps the drawer's edge swipe.
function pluginDrawerOptions(
  framed: boolean,
  location: PluginLocation,
): DrawerNavigationOptions {
  const { root } = pluginAt(location.plugins, location.path);

  return framed || !root ? stackOwnsHeader : drawerRootOptions;
}
