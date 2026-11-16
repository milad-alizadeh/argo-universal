import {
  Frame,
  FramePage,
  type FrameSections,
  FrameSidebar,
  SectionDrawer,
  sectionOf,
  sectionOrder,
  pluginPath,
  usePluginSections,
  PluginErrorToasts,
  coreNavigationSections,
  type PluginSection,
  useSectionLists,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import { usePathname } from 'expo-router';
import { Drawer, useDrawerStatus } from 'expo-router/drawer';
import type * as React from 'react';
import type { ComponentProps } from 'react';
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

// Every section's pages sit in the Frame's page pane, which in the phone shell fills it.
const inPage: ScreenLayout = ({ children }) => (
  <FramePage>{children}</FramePage>
);

interface SectionsProps {
  framed: boolean;
  frame: FrameSections;
  plugins: readonly PluginSection[];
}

function SectionsDrawer({
  framed,
  frame,
  plugins,
}: SectionsProps): React.JSX.Element {
  const options = frameDrawerOptions(framed, {
    plugins,
    path: usePathname(),
  });

  const pick = usePickSection(plugins, frame.section);
  const props = useSectionsDrawerProps(framed, frame, pick);

  return <Drawer {...props}>{sectionScreens(options)}</Drawer>;
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
): Pick<
  ComponentProps<typeof Drawer>,
  'screenOptions' | 'screenLayout' | 'drawerContent'
> {
  return {
    screenOptions: useDrawerOptions(useSizeClass()),
    screenLayout: inPage,
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
  const frame = useNavigationSections(plugins);
  const framed = sizeClass === 'wide';

  return (
    <Frame sizeClass={sizeClass} {...frame}>
      <PluginErrorToasts />
      <SectionsDrawer framed={framed} frame={frame} plugins={plugins} />
    </Frame>
  );
}

function useNavigationSections(
  plugins: readonly PluginSection[],
): FrameSections {
  return {
    section: sectionOf(usePathname()),
    lists: useSectionLists(),
    items: [...coreNavigationSections, ...plugins],
  };
}
