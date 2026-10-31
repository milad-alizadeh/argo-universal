import {
  Frame,
  FramePage,
  type FrameParts,
  FrameSidebar,
  SectionDrawer,
  sectionOf,
  sectionOrder,
  useFrame,
  pluginPath,
  usePluginSections,
  usePluginListChanges,
  PluginErrorToasts,
  coreNavigationSections,
  type PluginSection,
  useSectionLists,
  useNotifications,
  useRememberShownPage,
  type SizeClass,
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

interface NarrowContentProps {
  drawer: DrawerContent;
  frame: FrameParts;
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

// `drawerContent` is called as a function on each render (DrawerContentComponentProps), so it closes over the Frame's parts.
const contentAt = (framed: boolean, frame: FrameParts, pick: PickSection) =>
  function SectionsContent(drawer: DrawerContent): React.JSX.Element {
    return framed ? (
      <FrameSidebar
        frame={frame}
        onSectionChange={(section) => pick(drawer, section)}
      />
    ) : (
      <NarrowDrawerContent drawer={drawer} frame={frame} pick={pick} />
    );
  };

type ScreenLayout = NonNullable<ComponentProps<typeof Drawer>['screenLayout']>;

// Every section's pages sit in the Frame's page pane, which in the phone shell fills it.
const inPage =
  (frame: FrameParts): ScreenLayout =>
  ({ children }) => <FramePage frame={frame}>{children}</FramePage>;

interface SectionsProps {
  framed: boolean;
  frame: FrameParts;
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

function sectionScreens(
  options: ReturnType<typeof frameDrawerOptions>,
): React.ReactNode {
  return [...sectionOrder, 'plugins'].map((name) => (
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
  frame: FrameParts,
  pick: PickSection,
): Pick<
  ComponentProps<typeof Drawer>,
  'screenOptions' | 'screenLayout' | 'drawerContent'
> {
  return {
    screenOptions: useDrawerOptions(useSizeClass(), frame),
    screenLayout: inPage(frame),
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

// One drawer of sections at every width, so a width change keeps each section's pages; on a wide window the rail and the list sit beside the pages. Each section hands the Frame its list, and the Frame is told which section the path shows.
export function FrameNavigator(): React.JSX.Element {
  useNotifications(usePathname());
  useRememberShownPage();
  // A Plugin turned off elsewhere leaves the rail and its open page, as it does when the App reloads.
  usePluginListChanges();
  const sizeClass = useSizeClass();
  const framed = sizeClass === 'wide';
  const plugins = usePluginSections();
  const frame = useNavigationFrame(sizeClass, plugins);

  return (
    <Frame frame={frame}>
      <PluginErrorToasts />
      <SectionsDrawer framed={framed} frame={frame} plugins={plugins} />
    </Frame>
  );
}

function useNavigationFrame(
  sizeClass: SizeClass,
  plugins: readonly PluginSection[],
): FrameParts {
  return useFrame({
    sizeClass,
    section: sectionOf(usePathname()),
    lists: useSectionLists(),
    items: [...coreNavigationSections, ...plugins],
  });
}
