import type { Section } from '@repo/client';
import {
  hrefFor,
  sectionDestination,
  sectionOrder,
} from '@repo/client/navigation';
import type { DrawerContentComponentProps } from 'expo-router/drawer';

// The route every section's stack opens on: its list.
export const sectionRoot = 'index';

// A section's drawer route is the folder its list's path names, such as `sessions` for `/sessions`.
const routeOf = (section: Section): string =>
  hrefFor(sectionDestination(section)).pathname.slice(1);

// Each section's route, top to bottom in the drawer.
export const sectionRoutes = sectionOrder.map((section) => ({
  section,
  route: routeOf(section),
}));

// The section a drawer route shows; any other route, such as the redirecting index, counts as Sessions.
export const sectionOfRoute = (routeName?: string): Section =>
  sectionRoutes.find(({ route }) => route === routeName)?.section ?? 'sessions';

export type DrawerContent = Pick<
  DrawerContentComponentProps,
  'state' | 'navigation'
>;

type DrawerState = DrawerContent['state'];

export type DrawerRoute = DrawerState['routes'][number];

// As the stock drawer list does: the shown section's row closes the drawer, another's opens its route with the pages it had.
export function sectionPick(
  { index, routes }: Pick<DrawerState, 'index' | 'routes'>,
  section: Section,
): 'close' | DrawerRoute | undefined {
  const picked = routes.findIndex((entry) => entry.name === routeOf(section));

  if (picked === index) return 'close';

  return routes[picked];
}
