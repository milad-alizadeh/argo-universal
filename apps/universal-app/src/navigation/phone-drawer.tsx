import {
  PhoneConnectionBanner,
  type Section,
  SectionDrawer,
  usePhoneDrawerWidth,
} from '@repo/client';
import {
  Drawer,
  type DrawerContentComponentProps,
  type DrawerNavigationOptions,
  useDrawerStatus,
} from 'expo-router/drawer';
import {
  CommonActions,
  DrawerActions,
  getFocusedRouteNameFromRoute,
  type NavigationAction,
  type ParamListBase,
  type RouteProp,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

// Each section's route, top to bottom in the drawer; Sessions, first, is where the App opens.
const sectionRoutes = [
  { section: 'sessions', route: '(sessions)' },
  { section: 'issues', route: 'issues' },
  { section: 'atlas', route: 'atlas' },
  { section: 'settings', route: 'settings' },
] as const satisfies readonly { section: Section; route: string }[];

// The route every section's stack opens on.
const sectionRoot = 'index';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

// The narrow web keeps each root's stack header, with its own ☰.
const drawerHeader = Platform.OS !== 'web';

interface ScreenSource {
  route: RouteProp<ParamListBase>;
}

const atSectionRoot = (route: ScreenSource['route']): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? sectionRoot) === sectionRoot;

// A pushed page keeps its stack's header and its edge swipe goes back.
const pushedPageOptions = { headerShown: false, swipeEnabled: false };

const rootOptions = { headerShown: drawerHeader, swipeEnabled: edgeSwipeOpens };

// The drawer's header shows only on a section's root, so no page shows two.
const sectionScreenOptions = ({
  route,
}: ScreenSource): DrawerNavigationOptions =>
  atSectionRoot(route) ? rootOptions : pushedPageOptions;

function useDrawerOptions(width: number): DrawerNavigationOptions {
  const surface = useResolveClassNames('bg-content');

  return {
    // The drawer lies under the page, which slides aside; an overlay would shade the drawer, not the page.
    drawerType: 'back',
    overlayColor: 'transparent',
    // The web's themed page shows through; a resolved colour there misses the theme.
    drawerStyle: [drawerHeader ? surface : undefined, { width }],
    headerShadowVisible: false,
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}

const sectionOf = (routeName?: string): Section =>
  sectionRoutes.find(({ route }) => route === routeName)?.section ?? 'sessions';

type DrawerContent = Pick<DrawerContentComponentProps, 'state' | 'navigation'>;

type DrawerRoute = DrawerContent['state']['routes'][number];

const routeOf = (
  { state }: DrawerContent,
  section: Section,
): DrawerRoute | undefined => {
  const name = sectionRoutes.find((entry) => entry.section === section)?.route;

  return state.routes.find((entry) => entry.name === name);
};

// As the stock drawer list does: the shown section's row closes the drawer, another's navigates to it.
const pickAction = (
  { state }: DrawerContent,
  route: DrawerRoute,
): NavigationAction =>
  route.key === state.routes[state.index]?.key
    ? DrawerActions.closeDrawer()
    : CommonActions.navigate(route);

function pickSection(drawer: DrawerContent, section: Section): void {
  const route = routeOf(drawer, section);

  if (!route) return;

  drawer.navigation.dispatch({
    ...pickAction(drawer, route),
    target: drawer.state.key,
  });
}

interface SectionDrawerContentProps extends DrawerContent {
  width: number;
}

// Our rows in the drawer, picked through the drawer's own navigation.
function SectionDrawerContent({
  width,
  ...drawer
}: SectionDrawerContentProps): React.JSX.Element {
  return (
    <SectionDrawer
      selectedSection={sectionOf(drawer.state.routes[drawer.state.index]?.name)}
      open={useDrawerStatus() === 'open'}
      width={width}
      onSectionChange={(section) => pickSection(drawer, section)}
    />
  );
}

const sectionScreens = sectionRoutes.map(({ route }) => (
  <Drawer.Screen key={route} name={route} options={sectionScreenOptions} />
));

const contentAt =
  (width: number) =>
  (props: DrawerContent): React.JSX.Element => (
    <SectionDrawerContent {...props} width={width} />
  );

function SectionsDrawer(): React.JSX.Element {
  const width = usePhoneDrawerWidth();

  return (
    <Drawer
      screenOptions={useDrawerOptions(width)}
      drawerContent={contentAt(width)}
    >
      {sectionScreens}
    </Drawer>
  );
}

// The phone's sections in Expo Router's drawer: each keeps its stack while another shows, and ☰ in its root's header opens the drawer.
export function PhoneDrawer(): React.JSX.Element {
  return (
    <View testID="phone-shell" className="flex-1">
      <SectionsDrawer />
      <PhoneConnectionBanner />
    </View>
  );
}
