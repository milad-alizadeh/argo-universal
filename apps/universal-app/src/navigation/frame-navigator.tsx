import {
  Frame,
  FramePage,
  type FrameParts,
  FrameSidebar,
  frameSidebarWidth,
  type Section,
  SectionDrawer,
  sectionOf,
  sectionOrder,
  type SizeClass,
  useFrame,
  usePhoneDrawerWidth,
  useSectionLists,
  useSizeClass,
} from '@repo/client';
import { usePathname } from 'expo-router';
import {
  Drawer,
  type DrawerContentComponentProps,
  type DrawerNavigationOptions,
  useDrawerStatus,
} from 'expo-router/drawer';
import { CommonActions, DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { drawerScreenOptions } from './section-stack';

// ADR-0026: the drawer sits in front of the pages until the medium layout is built, and beside them on a wide window.
const drawerTypes = {
  compact: 'front',
  medium: 'front',
  wide: 'permanent',
} as const satisfies Record<SizeClass, DrawerNavigationOptions['drawerType']>;

// The Frame lays out a medium window as a compact one until the medium layout is built.
const frameSizeClass = (wide: boolean): SizeClass =>
  wide ? 'wide' : 'compact';

// The web's themed page shows through the drawer; a resolved colour there misses the theme.
const drawerSurface = Platform.OS !== 'web';

type DrawerContent = Pick<DrawerContentComponentProps, 'state' | 'navigation'>;

function useNarrowOptions(): DrawerNavigationOptions {
  const surface = useResolveClassNames('bg-content');

  return {
    drawerStyle: [
      drawerSurface ? surface : undefined,
      { width: usePhoneDrawerWidth() },
    ],
    headerShadowVisible: false,
  };
}

// The rail and the list stay beside the pages, on the window's own surface; the glass sidebar draws its own edge.
function wideOptions(frame: FrameParts): DrawerNavigationOptions {
  return {
    drawerStyle: {
      width: frameSidebarWidth(frame),
      backgroundColor: 'transparent',
      borderRightWidth: 0,
    },
    sceneStyle: { backgroundColor: 'transparent' },
  };
}

function useDrawerOptions(
  sizeClass: SizeClass,
  frame: FrameParts,
): DrawerNavigationOptions {
  const narrow = useNarrowOptions();

  return {
    ...(sizeClass === 'wide' ? wideOptions(frame) : narrow),
    drawerType: drawerTypes[sizeClass],
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}

// As the stock drawer list does: the shown section's row closes the drawer; another's opens its route with the pages it had.
function pickSection(
  { state, navigation }: DrawerContent,
  section: Section,
): void {
  const picked = state.routes.findIndex((route) => route.name === section);
  const route = state.routes[picked];

  if (!route) return;

  navigation.dispatch({
    ...(picked === state.index
      ? DrawerActions.closeDrawer()
      : CommonActions.navigate(route)),
    target: state.key,
  });
}

function NarrowDrawerContent(drawer: DrawerContent): React.JSX.Element {
  return (
    <SectionDrawer
      selectedSection={sectionOf(drawer.state.routes[drawer.state.index]?.name)}
      open={useDrawerStatus() === 'open'}
      width={usePhoneDrawerWidth()}
      onSectionChange={(section) => pickSection(drawer, section)}
    />
  );
}

// `drawerContent` is called as a function on each render (DrawerContentComponentProps), so it closes over the Frame's parts.
const contentAt = (wide: boolean, frame: FrameParts) =>
  function SectionsContent(drawer: DrawerContent): React.JSX.Element {
    return wide ? (
      <FrameSidebar
        frame={frame}
        onSectionChange={(section) => pickSection(drawer, section)}
      />
    ) : (
      <NarrowDrawerContent {...drawer} />
    );
  };

type ScreenLayout = NonNullable<ComponentProps<typeof Drawer>['screenLayout']>;

// Every section's pages sit in the Frame's page pane, which on a narrow window fills it.
const inPage =
  (frame: FrameParts): ScreenLayout =>
  ({ children }) => <FramePage frame={frame}>{children}</FramePage>;

interface SectionsProps {
  wide: boolean;
  frame: FrameParts;
}

function SectionsDrawer({ wide, frame }: SectionsProps): React.JSX.Element {
  const options = drawerScreenOptions(wide, frame.lists);

  return (
    <Drawer
      screenOptions={useDrawerOptions(useSizeClass(), frame)}
      screenLayout={inPage(frame)}
      drawerContent={contentAt(wide, frame)}
    >
      {sectionOrder.map((section) => (
        <Drawer.Screen key={section} name={section} options={options} />
      ))}
    </Drawer>
  );
}

// One drawer of sections at every width, so a width change keeps each section's pages; each section hands the Frame its list, and the Frame is told which section the path shows.
export function FrameNavigator(): React.JSX.Element {
  const wide = useSizeClass() === 'wide';

  const frame = useFrame({
    sizeClass: frameSizeClass(wide),
    section: sectionOf(usePathname()),
    lists: useSectionLists(),
  });

  return (
    <Frame frame={frame}>
      <SectionsDrawer wide={wide} frame={frame} />
    </Frame>
  );
}
