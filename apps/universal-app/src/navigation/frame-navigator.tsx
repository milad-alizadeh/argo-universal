import {
  Frame,
  FramePage,
  type FrameSections,
  FrameSidebar,
  SectionDrawer,
  sectionOf,
  isCoreSection,
  sectionOrder,
  pluginPath,
  usePluginSections,
  PluginErrorToasts,
  coreNavigationSections,
  type PluginSection,
  useSectionLists,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import { SectionModal } from '@repo/kit/primitives/scaffolds/section-modal';
import { usePathname, useSegments } from 'expo-router';
import { Drawer, useDrawerStatus } from 'expo-router/drawer';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { CommonActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useLayoutEffect, useRef, type ComponentProps } from 'react';
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

type ScreenLayout = NonNullable<ComponentProps<typeof Drawer>['screenLayout']>;

interface SectionsProps {
  framed: boolean;
  frame: FrameSections;
  plugins: readonly PluginSection[];
  modal?: ModalSection;
  opener: React.RefObject<HTMLElement | null>;
}

interface ModalSection {
  name: string;
  title: string;
  list: React.ReactNode;
  backdropRoute: string;
  opener: React.RefObject<HTMLElement | null>;
}

function SectionsDrawer({
  framed,
  frame,
  plugins,
  modal,
  opener,
}: SectionsProps): React.JSX.Element {
  const path = usePathname();
  const focused = (useSegments() as readonly string[])[1];
  const options = frameDrawerOptions(framed, { plugins, path });
  const pick = usePickSection(plugins, sectionOf(path));
  const props = useSectionsDrawerProps(framed, frame, (drawer, section) => {
    if (
      framed &&
      frame.items.some(
        (item) => item.id === section && item.widePresentation === 'modal',
      )
    ) {
      const focused =
        typeof document === 'undefined' ? null : document.activeElement;
      if (typeof HTMLElement !== 'undefined' && focused instanceof HTMLElement)
        opener.current = focused;
    }

    pick(drawer, section);
  });

  const screenLayout: ScreenLayout = ({ children, route, navigation }) => {
    if (!modal || route.name !== modal.name)
      return <FramePage>{children}</FramePage>;

    return (
      <SectionModal
        label={modal.title}
        list={modal.list}
        onClose={() => {
          const state: DrawerContent['state'] = navigation.getState();
          const backdrop = state.routes.find(
            (item) => item.name === modal.backdropRoute,
          );
          if (backdrop)
            navigation.dispatch({
              ...CommonActions.navigate({
                name: backdrop.name,
                params: backdrop.params,
              }),
              target: state.key,
            });
        }}
        onCloseAutoFocus={(event) => {
          const opener = modal.opener.current;
          if (!opener) return;
          event.preventDefault();
          requestAnimationFrame(() => opener.focus());
        }}
      >
        {children}
      </SectionModal>
    );
  };

  return (
    <Drawer
      {...props}
      detachInactiveScreens={!framed}
      screenLayout={screenLayout}
    >
      {sectionScreens(({ route }) => ({
        ...options({ route }),
        ...wideScene(framed, route.name, focused, modal),
      }))}
    </Drawer>
  );
}

function wideScene(
  framed: boolean,
  route: string,
  focused: string | undefined,
  modal: ModalSection | undefined,
): DrawerNavigationOptions {
  if (!framed) return {};

  return {
    keepVisibleOnBlur: route === modal?.backdropRoute,
    sceneStyle: {
      backgroundColor: 'transparent',
      display:
        route === focused || route === modal?.backdropRoute ? 'flex' : 'none',
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
  const path = usePathname();
  const route = (useSegments() as readonly string[])[1];
  const section = sectionOf(path);
  const items = [...coreNavigationSections, ...plugins];
  const modalItem = items.find(
    (item) => item.id === section && item.widePresentation === 'modal',
  );
  const wideModal =
    framed && modalItem && isCoreSection(modalItem.id) ? modalItem : undefined;
  const previous = useRef({ path: '/sessions', route: 'sessions' });
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!modalItem) {
      previous.current = { path, route: route ?? 'sessions' };
    }
  }, [modalItem, path, route]);

  const lists = useSectionLists(wideModal ? previous.current.path : undefined);
  const frame: FrameSections = {
    section: wideModal ? sectionOf(previous.current.path) : section,
    lists,
    items,
  };
  const modal =
    wideModal && isCoreSection(wideModal.id)
      ? {
          name: wideModal.id,
          title: wideModal.title,
          list: lists[wideModal.id].list,
          backdropRoute: previous.current.route,
          opener,
        }
      : undefined;

  return (
    <Frame sizeClass={sizeClass} {...frame}>
      <PluginErrorToasts />
      <SectionsDrawer
        framed={framed}
        frame={frame}
        plugins={plugins}
        modal={modal}
        opener={opener}
      />
    </Frame>
  );
}
