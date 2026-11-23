import {
  Frame,
  FramePage,
  type FrameSections,
  type CoreSection,
  FrameSidebar,
  SectionDrawer,
  sectionOf,
  isCoreSection,
  sectionOrder,
  sections,
  pluginPath,
  usePluginSections,
  PluginErrorToasts,
  coreNavigationSections,
  type PluginSection,
  useSectionLists,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import { SectionModalPage } from '@repo/kit/primitives/scaffolds/section-modal';
import { SectionBackdropVisibility } from '@repo/kit/use-shown-page';
import { usePathname, useSegments } from 'expo-router';
import { Drawer, useDrawerStatus } from 'expo-router/drawer';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { CommonActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { drawerScrimLabel } from './compose-drawer-options';
import { useDrawerOptions } from './frame-drawer-options';
import {
  usePickSection,
  type DrawerContent,
  type PickSection,
} from './frame-navigation';
import { frameDrawerOptions } from './plugin-drawer';
import { useShellListeners } from './use-shell-listeners';

interface NarrowContentProps {
  drawer: DrawerContent;
  frame: FrameSections;
  pick: PickSection;
}

function NarrowDrawerContent({
  drawer,
  frame,
  pick,
}: NarrowContentProps): React.JSX.Element {
  return (
    <SectionDrawer
      selectedSection={frame.section}
      items={frame.items}
      open={useDrawerStatus() === 'open'}
      scrimLabel={drawerScrimLabel}
      onSectionChange={(section) => pick(drawer, section)}
    />
  );
}

// `drawerContent` is called as a function on each render (DrawerContentComponentProps), so it closes over the shown section.
const contentAt = (framed: boolean, frame: FrameSections, pick: PickSection) =>
  function SectionsContent(drawer: DrawerContent): React.JSX.Element {
    return framed ? (
      <FrameSidebar onSectionChange={(section) => pick(drawer, section)} />
    ) : (
      <NarrowDrawerContent drawer={drawer} frame={frame} pick={pick} />
    );
  };

const inFramePage = (children: React.ReactNode): React.JSX.Element => (
  <FramePage>{children}</FramePage>
);

type ScreenLayout = NonNullable<ComponentProps<typeof Drawer>['screenLayout']>;

interface SectionsProps {
  framed: boolean;
  frame: FrameSections;
  plugins: readonly PluginSection[];
  modal?: ModalSection;
  path: string;
  focused: string | undefined;
  restoreFocus: (event: Event) => void;
}

interface ModalSection {
  title: string;
  list: React.ReactNode;
  backdropRoute: string;
}

function SectionsDrawer({
  framed,
  frame,
  plugins,
  modal,
  path,
  focused,
  restoreFocus,
}: SectionsProps): React.JSX.Element {
  const options = frameDrawerOptions(framed, { plugins, path });
  const pick = usePickSection(plugins, sectionOf(path));
  const props = useSectionsDrawerProps(framed, frame, pick);

  return (
    <Drawer
      {...props}
      detachInactiveScreens={!framed}
      screenLayout={sectionLayout(modal, restoreFocus)}
    >
      {sectionScreens(({ route }) => ({
        ...options({ route }),
        ...wideScene({
          framed,
          route: route.name,
          focused,
          backdrop: modal?.backdropRoute,
        }),
      }))}
    </Drawer>
  );
}

type SceneNavigation = Parameters<ScreenLayout>[0]['navigation'];

function closeToBackdrop(navigation: SceneNavigation, routeName: string): void {
  const state: DrawerContent['state'] = navigation.getState();
  const route = state.routes.find((item) => item.name === routeName);

  if (route)
    navigation.dispatch({
      ...CommonActions.navigate({ name: route.name, params: route.params }),
      target: state.key,
    });
}

function sectionLayout(
  modal: ModalSection | undefined,
  restoreFocus: SectionsProps['restoreFocus'],
): ScreenLayout {
  return ({ children, route, navigation }) => {
    if (!modalSectionOf(route.name)) {
      return (
        <SectionBackdropVisibility value={route.name === modal?.backdropRoute}>
          {inFramePage(children)}
        </SectionBackdropVisibility>
      );
    }

    return (
      <SectionModalPage
        renderPage={inFramePage}
        modal={
          modal && {
            label: modal.title,
            list: modal.list,
            onClose: (): void =>
              closeToBackdrop(navigation, modal.backdropRoute),
            onCloseAutoFocus: restoreFocus,
          }
        }
      >
        {children}
      </SectionModalPage>
    );
  };
}

function modalSectionOf(name: string | undefined): CoreSection | undefined {
  return isCoreSection(name) && sections[name].widePresentation === 'modal'
    ? name
    : undefined;
}

interface SceneVisibility {
  framed: boolean;
  route: string;
  focused: string | undefined;
  backdrop: string | undefined;
}

function wideScene({
  framed,
  route,
  focused,
  backdrop,
}: SceneVisibility): DrawerNavigationOptions {
  if (!framed) return {};

  return {
    keepVisibleOnBlur: route === backdrop,
    sceneStyle: {
      backgroundColor: 'transparent',
      display: route === focused || route === backdrop ? 'flex' : 'none',
    },
  };
}

// `+not-found` is the Frame's own page for an unknown path: left out, the drawer keeps no options for it and its sidebar never draws.
function sectionScreens(
  options: ReturnType<typeof frameDrawerOptions>,
): React.ReactNode {
  return [...sectionOrder, 'plugins', '+not-found'].map((name) => (
    <Drawer.Screen
      key={name}
      name={name}
      options={options}
      dangerouslySingular={pluginRouteId}
    />
  ));
}

function useSectionsDrawerProps(
  framed: boolean,
  frame: FrameSections,
  pick: PickSection,
): Pick<ComponentProps<typeof Drawer>, 'screenOptions' | 'drawerContent'> {
  return {
    screenOptions: useDrawerOptions(useSizeClass()),
    drawerContent: contentAt(framed, frame, pick),
  };
}

interface PluginRouteParams {
  pluginSection?: string;
  params?: { path?: string[] };
}

// The catch-all route takes a distinct key for each Plugin nav item, read from its path or the section a pick names.
const pluginRouteId = (
  _name: string,
  { pluginSection, params }: PluginRouteParams,
): string | undefined =>
  params?.path ? sectionOf(pluginPath(params.path)) : pluginSection;

/*
 * One drawer of sections at every width, so a width change keeps each section's pages; on a wide window the rail and
 * the list sit beside the pages. Each section hands the Frame its list, and the Frame is told which section the path
 * shows. The Frame holds its own state, so a page's claim redraws the Frame and not this navigator.
 */
export function FrameNavigator(): React.JSX.Element {
  useShellListeners();
  const sizeClass = useSizeClass();
  const plugins = usePluginSections();
  const framed = sizeClass === 'wide';
  const presentation = useFramePresentation(framed, plugins);
  const restoreFocus = useModalOpener(Boolean(presentation.modal));

  return (
    <Frame sizeClass={sizeClass} {...presentation.frame}>
      <PluginErrorToasts />
      <SectionsDrawer
        framed={framed}
        plugins={plugins}
        restoreFocus={restoreFocus}
        {...presentation}
      />
    </Frame>
  );
}

interface Location {
  path: string;
  route: string;
}

const firstLocation: Location = { path: '/sessions', route: 'sessions' };

function useBackdrop(location: Location, showingModal: boolean): Location {
  const [lastPage, remember] = useState(firstLocation);

  if (!showingModal && lastPage.path !== location.path) remember(location);

  return lastPage;
}

type FramePresentation = Pick<
  SectionsProps,
  'frame' | 'focused' | 'path' | 'modal'
>;

function useFramePresentation(
  framed: boolean,
  plugins: readonly PluginSection[],
): FramePresentation {
  const path = usePathname();
  const segments: readonly string[] = useSegments();
  const focused = segments[1];
  const section = sectionOf(path);
  const modalSection = modalSectionOf(section);

  const backdrop = useBackdrop(
    { path, route: focused ?? firstLocation.route },
    Boolean(modalSection),
  );

  const shown = framed ? modalSection : undefined;
  const lists = useSectionLists(shown ? backdrop.path : undefined);

  return {
    frame: {
      section: shown ? sectionOf(backdrop.path) : section,
      lists,
      items: [...coreNavigationSections, ...plugins],
    },
    focused,
    path,
    modal: shown && {
      title: sections[shown].title,
      list: lists[shown].list,
      backdropRoute: backdrop.route,
    },
  };
}

// Track the element that opens the modal, whether it is a rail tile or a page Action.
function useModalOpener(open: boolean): (event: Event) => void {
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open || typeof document === 'undefined') return;

    const remember = (event: FocusEvent): void => {
      if (event.target instanceof HTMLElement && event.target !== document.body)
        opener.current = event.target;
    };

    document.addEventListener('focusin', remember);

    return (): void => document.removeEventListener('focusin', remember);
  }, [open]);

  return (event): void => {
    const node = opener.current;

    if (!node?.isConnected) return;

    event.preventDefault();
    requestAnimationFrame(() => node.focus());
  };
}
