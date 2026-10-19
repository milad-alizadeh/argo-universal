import { pluginAt, type PluginSection, type SectionLists } from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import type { ParamListBase, RouteProp } from 'expo-router/react-navigation';
import {
  drawerRootOptions,
  drawerScreenOptions,
  stackOwnsHeader,
} from './section-drawer-options';

type PluginLocation = { plugins: readonly PluginSection[]; path: string };

type FrameSections = PluginLocation & { lists: SectionLists };

export const frameDrawerOptions =
  (framed: boolean, sections: FrameSections) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions => {
    if (route.name === 'plugins') return pluginDrawerOptions(framed, sections);

    return drawerScreenOptions(framed, sections.lists)({ route });
  };

// A Plugin has no SectionList: its narrow root header is the nav item's title, or none while its Plugin is unknown, which still opens the drawer.
function pluginDrawerOptions(
  framed: boolean,
  location: PluginLocation,
): DrawerNavigationOptions {
  const { section, root } = pluginAt(location.plugins, location.path);

  return framed || !root
    ? stackOwnsHeader
    : drawerRootOptions({ title: titleOf(section) });
}

const titleOf = (section: PluginSection | undefined): string =>
  section?.title ?? '';
