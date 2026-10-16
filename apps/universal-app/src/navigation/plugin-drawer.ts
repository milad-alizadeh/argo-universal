import { sectionOf, type PluginSection, type SectionLists } from '@repo/client';
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
  (wide: boolean, sections: FrameSections) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions => {
    if (route.name === 'plugins') return pluginDrawerOptions(wide, sections);

    return drawerScreenOptions(wide, sections.lists)({ route });
  };

function pluginDrawerOptions(
  wide: boolean,
  location: PluginLocation,
): DrawerNavigationOptions {
  const section = location.plugins.find(
    (plugin) => plugin.id === sectionOf(location.path),
  );

  if (!section || wide) return stackOwnsHeader;

  return pluginRootOptions(section, location.path);
}

function pluginRootOptions(
  section: PluginSection,
  path: string,
): DrawerNavigationOptions {
  return path === `/plugins/${section.segments.join('/')}`
    ? drawerRootOptions({ title: section.title })
    : stackOwnsHeader;
}
