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
  PluginErrorToasts,
  coreNavigationSections,
  type PluginSection,
  usePhoneDrawerWidth,
  useSectionLists,
  useNotifications,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import { usePathname } from 'expo-router';
import { Drawer, useDrawerStatus } from 'expo-router/drawer';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { useDrawerOptions, frameSizeClass } from './frame-drawer-options';
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
      width={usePhoneDrawerWidth()}
      onSectionChange={(section) => pick(drawer, section)}
    />
  );
}

// `drawerContent` is called as a function on each render (DrawerContentComponentProps), so it closes over the Frame's parts.
const contentAt = (wide: boolean, frame: FrameParts, pick: PickSection) =>
  function SectionsContent(drawer: DrawerContent): React.JSX.Element {
    return wide ? (
      <FrameSidebar
        frame={frame}
        onSectionChange={(section) => pick(drawer, section)}
      />
    ) : (
      <NarrowDrawerContent drawer={drawer} frame={frame} pick={pick} />
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
  plugins: readonly PluginSection[];
}

function SectionsDrawer({
  wide,
  frame,
  plugins,
}: SectionsProps): React.JSX.Element {
  const options = frameDrawerOptions(wide, {
    lists: frame.lists,
    plugins,
    path: usePathname(),
  });

  const pick = usePickSection(plugins, frame.section);
  const props = useSectionsDrawerProps(wide, frame, pick);

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
  wide: boolean,
  frame: FrameParts,
  pick: PickSection,
): Pick<
  ComponentProps<typeof Drawer>,
  'screenOptions' | 'screenLayout' | 'drawerContent'
> {
  return {
    screenOptions: useDrawerOptions(useSizeClass(), frame),
    screenLayout: inPage(frame),
    drawerContent: contentAt(wide, frame, pick),
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

// One drawer of sections at every width, so a width change keeps each section's pages; each section hands the Frame its list, and the Frame is told which section the path shows.
export function FrameNavigator(): React.JSX.Element {
  useNotifications(usePathname());
  const wide = useSizeClass() === 'wide';
  const plugins = usePluginSections();
  const frame = useNavigationFrame(wide, plugins);

  return (
    <Frame frame={frame}>
      <PluginErrorToasts />
      <SectionsDrawer wide={wide} frame={frame} plugins={plugins} />
    </Frame>
  );
}

function useNavigationFrame(
  wide: boolean,
  plugins: readonly PluginSection[],
): FrameParts {
  return useFrame({
    sizeClass: frameSizeClass(wide),
    section: sectionOf(usePathname()),
    lists: useSectionLists(),
    items: [...coreNavigationSections, ...plugins],
  });
}
