import {
  DesktopShellDetail,
  DesktopShellSidebar,
  type Section,
  SectionDrawer,
  type SectionRootHeaders,
  ShellFrame,
  useDesktopSidebarWidth,
  usePhoneDrawerWidth,
  useSectionRootHeaders,
  useWide,
} from '@repo/client';
import {
  Drawer,
  type DrawerNavigationOptions,
  useDrawerStatus,
} from 'expo-router/drawer';
import {
  CommonActions,
  DrawerActions,
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type RouteProp,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import {
  type DrawerContent,
  sectionOfRoute,
  sectionRoot,
  sectionPick,
  sectionRoutes,
} from './drawer-sections';
import { drawerRootOptions } from './section-root-options';
import { useDestination } from './use-destination';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

// The web's themed page shows through the drawer; a resolved colour there misses the theme.
const drawerSurface = Platform.OS !== 'web';

interface ScreenSource {
  route: RouteProp<ParamListBase>;
}

const atSectionRoot = (route: ScreenSource['route']): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? sectionRoot) === sectionRoot;

// A pushed page keeps its stack's header and its edge swipe goes back.
const pushedPageOptions = { headerShown: false, swipeEnabled: false };

// A wide window's sections sit beside the permanent drawer; each page draws its own header.
const wideScreenOptions = { headerShown: false, swipeEnabled: false };

// The drawer's header shows only on a section's root, so no page shows two.
const screenOptionsAt =
  (wide: boolean, headers: SectionRootHeaders) =>
  ({ route }: ScreenSource): DrawerNavigationOptions => {
    if (wide) return wideScreenOptions;

    if (!atSectionRoot(route)) return pushedPageOptions;

    return {
      ...drawerRootOptions(headers[sectionOfRoute(route.name)]),
      swipeEnabled: edgeSwipeOpens,
    };
  };

function useNarrowOptions(): DrawerNavigationOptions {
  const surface = useResolveClassNames('bg-content');

  return {
    // The drawer slides in over the page, under the stock overlay.
    drawerType: 'front',
    drawerStyle: [
      drawerSurface ? surface : undefined,
      { width: usePhoneDrawerWidth() },
    ],
    headerShadowVisible: false,
  };
}

function useWideOptions(): DrawerNavigationOptions {
  return {
    // The rail and the list stay beside the pages, on the window's own surface; the glass sidebar draws its own edge.
    drawerType: 'permanent',
    drawerStyle: {
      width: useDesktopSidebarWidth(),
      backgroundColor: 'transparent',
      borderRightWidth: 0,
    },
    sceneStyle: { backgroundColor: 'transparent' },
  };
}

function useDrawerOptions(wide: boolean): DrawerNavigationOptions {
  const narrow = useNarrowOptions();
  const wideOptions = useWideOptions();

  return {
    ...(wide ? wideOptions : narrow),
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}

// Picks a section through the drawer's own navigation.
function pickSection(drawer: DrawerContent, section: Section): void {
  const pick = sectionPick(drawer.state, section);

  if (!pick) return;

  drawer.navigation.dispatch({
    ...(pick === 'close'
      ? DrawerActions.closeDrawer()
      : CommonActions.navigate(pick)),
    target: drawer.state.key,
  });
}

// Our section rows in the narrow drawer, picked through the drawer's own navigation.
function NarrowDrawerContent(drawer: DrawerContent): React.JSX.Element {
  return (
    <SectionDrawer
      selectedSection={sectionOfRoute(
        drawer.state.routes[drawer.state.index]?.name,
      )}
      open={useDrawerStatus() === 'open'}
      width={usePhoneDrawerWidth()}
      onSectionChange={(section) => pickSection(drawer, section)}
    />
  );
}

const contentAt =
  (wide: boolean) =>
  (drawer: DrawerContent): React.JSX.Element =>
    wide ? (
      <DesktopShellSidebar
        onSectionChange={(section) => pickSection(drawer, section)}
      />
    ) : (
      <NarrowDrawerContent {...drawer} />
    );

type ScreenLayout = NonNullable<ComponentProps<typeof Drawer>['screenLayout']>;

// Every section's pages sit in the detail pane, which on a narrow window fills it.
const inDetail: ScreenLayout = ({ children }) => (
  <DesktopShellDetail>{children}</DesktopShellDetail>
);

function SectionsDrawer({ wide }: { wide: boolean }): React.JSX.Element {
  const screenOptions = screenOptionsAt(wide, useSectionRootHeaders());

  return (
    <Drawer
      screenOptions={useDrawerOptions(wide)}
      screenLayout={inDetail}
      drawerContent={contentAt(wide)}
    >
      {sectionRoutes.map(({ route }) => (
        <Drawer.Screen key={route} name={route} options={screenOptions} />
      ))}
    </Drawer>
  );
}

// One drawer of sections at every width: permanent beside the pages on a wide window, behind them on a narrow one. Each section keeps its stack while another shows.
export function ShellDrawer(): React.JSX.Element {
  const wide = useWide();

  return (
    <ShellFrame destination={useDestination()} wide={wide}>
      <SectionsDrawer wide={wide} />
    </ShellFrame>
  );
}
