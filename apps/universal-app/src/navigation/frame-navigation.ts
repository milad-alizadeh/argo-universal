import {
  isPluginSection,
  type PluginSection,
  type Section,
} from '@repo/client';
import { useRouter } from 'expo-router';
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

type Router = ReturnType<typeof useRouter>;

type Destination = { drawer: DrawerContent; section: Section; router: Router };

// The catch-all route gets a distinct route key and saved stack for each manifest nav item.
export function usePickSection(
  plugins: readonly PluginSection[],
  shown: Section,
): PickSection {
  const stacks = useRef<SavedStacks>(new Map());
  const router = useRouter();

  return (drawer, section) => {
    rememberPlugin(drawer, shown, stacks.current);

    if (section === shown)
      drawer.navigation.dispatch(DrawerActions.closeDrawer());
    else openSection({ drawer, section, router }, plugins, stacks.current);
  };
}

function rememberPlugin(
  drawer: DrawerContent,
  shown: Section,
  stacks: SavedStacks,
): void {
  const route = drawer.state.routes.find((item) => item.name === 'plugins');

  if (isPluginSection(shown) && route) stacks.set(shown, route);
}

function openSection(
  destination: Destination,
  plugins: readonly PluginSection[],
  stacks: SavedStacks,
): void {
  const plugin = plugins.find((item) => item.id === destination.section);

  if (plugin) openPlugin(destination, plugin, stacks.get(destination.section));
  else openCore(destination);
}

/*
 * The section is named, never handed its own pages: Expo Router 58 drops state an action carries and
 * warns, and the section's pages are in the Frame's state already.
 */
function openCore({ drawer, section }: Destination): void {
  const route = drawer.state.routes.find((item) => item.name === section);

  if (route)
    drawer.navigation.dispatch({
      ...CommonActions.navigate({ name: route.name, params: route.params }),
      target: drawer.state.key,
    });
}

/*
 * A nav item with no stack to go back to opens its root page by href: Expo Router 58 builds the URL
 * from the navigation state alone, so a navigate action carrying the page in its params lands on
 * `/plugins` with nothing to show.
 */
function openPlugin(
  { drawer, router }: Destination,
  plugin: PluginSection,
  saved: DrawerRoute | undefined,
): void {
  if (saved)
    drawer.navigation.dispatch(
      CommonActions.reset(restoreStack(drawer.state, saved)),
    );
  else router.navigate(plugin.rootPath);
}

function restoreStack(
  state: DrawerContent['state'],
  saved: DrawerRoute,
): DrawerContent['state'] {
  const routes = state.routes.map((route) =>
    route.name === 'plugins' ? saved : route,
  );

  const index = routes.indexOf(saved);

  return { ...state, index, routes, history: firstRouteHistory(routes, index) };
}

type DrawerHistory = DrawerContent['state']['history'];

// The history the drawer's `firstRoute` back behaviour keeps, so Back from a restored Plugin returns to the first section rather than leaving the App.
function firstRouteHistory(
  routes: DrawerContent['state']['routes'],
  index: number,
): DrawerHistory {
  const keys = new Set(
    [routes[0], routes[index]].flatMap((route) => (route ? [route.key] : [])),
  );

  return [...keys].map((key) => ({ type: 'route', key }));
}
