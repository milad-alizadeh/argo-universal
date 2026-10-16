import type { PluginSection, Section } from '@repo/client';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { CommonActions, DrawerActions } from 'expo-router/react-navigation';
import { useRef } from 'react';

export type DrawerContent = Pick<
  DrawerContentComponentProps,
  'state' | 'navigation'
>;

type DrawerRoute = DrawerContent['state']['routes'][number];

type SavedStacks = Map<Section, DrawerRoute>;

export type PickSection = (drawer: DrawerContent, section: Section) => void;

type Destination = { drawer: DrawerContent; section: Section };

// The catch-all route gets a distinct route key and saved stack for each manifest nav item.
export function usePickSection(
  plugins: readonly PluginSection[],
  shown: Section,
): PickSection {
  const stacks = useRef<SavedStacks>(new Map());

  return (drawer, section) => {
    rememberPlugin(drawer, shown, stacks.current);

    if (section === shown)
      drawer.navigation.dispatch(DrawerActions.closeDrawer());
    else openSection({ drawer, section }, plugins, stacks.current);
  };
}

function rememberPlugin(
  drawer: DrawerContent,
  shown: Section,
  stacks: SavedStacks,
): void {
  const route = drawer.state.routes.find((item) => item.name === 'plugins');

  if (shown.startsWith('plugins/') && route) stacks.set(shown, route);
}

function openSection(
  destination: Destination,
  plugins: readonly PluginSection[],
  stacks: SavedStacks,
): void {
  const plugin = plugins.find((item) => item.id === destination.section);

  if (plugin)
    openPlugin(destination.drawer, plugin, stacks.get(destination.section));
  else openCore(destination);
}

function openCore({ drawer, section }: Destination): void {
  const route = drawer.state.routes.find((item) => item.name === section);

  if (route)
    drawer.navigation.dispatch({
      ...CommonActions.navigate(route),
      target: drawer.state.key,
    });
}

function openPlugin(
  drawer: DrawerContent,
  plugin: PluginSection,
  saved: DrawerRoute | undefined,
): void {
  if (saved)
    drawer.navigation.dispatch(
      CommonActions.reset(restoreStack(drawer.state, saved)),
    );
  else drawer.navigation.dispatch(pluginDestination(plugin));
}

function restoreStack(
  state: DrawerContent['state'],
  saved: DrawerRoute,
): DrawerContent['state'] {
  const routes = state.routes.map((route) =>
    route.name === 'plugins' ? saved : route,
  );

  return {
    ...state,
    index: routes.indexOf(saved),
    routes,
    history: [{ type: 'route', key: saved.key }],
  };
}

function pluginDestination(
  plugin: PluginSection,
): ReturnType<typeof CommonActions.navigate> {
  return CommonActions.navigate('plugins', {
    pluginSection: plugin.id,
    screen: '[...path]',
    params: { path: plugin.segments },
  });
}
