import type { Section } from '@repo/client';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import {
  CommonActions,
  DrawerActions,
  type NavigationAction,
} from 'expo-router/react-navigation';

// Each section's route, top to bottom in the drawer.
export const sectionRoutes = [
  { section: 'sessions', route: 'sessions' },
  { section: 'issues', route: 'issues' },
  { section: 'atlas', route: 'atlas' },
  { section: 'settings', route: 'settings' },
] as const satisfies readonly { section: Section; route: string }[];

// The section a drawer route shows; any other route, such as the redirecting index, counts as Sessions.
export const sectionOfRoute = (routeName?: string): Section =>
  sectionRoutes.find(({ route }) => route === routeName)?.section ?? 'sessions';

export type DrawerContent = Pick<
  DrawerContentComponentProps,
  'state' | 'navigation'
>;

type DrawerRoute = DrawerContent['state']['routes'][number];

const routeOf = (
  { state }: DrawerContent,
  section: Section,
): DrawerRoute | undefined => {
  const name = sectionRoutes.find((entry) => entry.section === section)?.route;

  return state.routes.find((entry) => entry.name === name);
};

// As the stock drawer list does: the shown section's row closes the drawer, another's navigates to it with the pages it had.
const pickAction = (
  { state }: DrawerContent,
  route: DrawerRoute,
): NavigationAction =>
  route.key === state.routes[state.index]?.key
    ? DrawerActions.closeDrawer()
    : CommonActions.navigate(route);

export function pickSection(drawer: DrawerContent, section: Section): void {
  const route = routeOf(drawer, section);

  if (!route) return;

  drawer.navigation.dispatch({
    ...pickAction(drawer, route),
    target: drawer.state.key,
  });
}
