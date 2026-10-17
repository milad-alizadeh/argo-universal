import {
  hasLiquidGlass,
  PhoneConnectionBanner,
  SectionMenuButton,
  screenHeaderOptions,
  type CoreSection,
  type SectionList,
  useSectionList,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import {
  type NativeStackNavigationOptions,
  Stack,
  useNavigation,
} from 'expo-router';
import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import { DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import { headerTitleOptions } from './header-title';
import { drawerDrawsRootHeader } from './section-drawer-options';

type ScreenHeaderProps = SectionList['rootHeader'];

type StackProps = ComponentProps<typeof Stack>;

type ScreenLayout = NonNullable<StackProps['screenLayout']>;

// With Liquid Glass, content scrolls under a clear header; before it, the opaque header takes the theme's content colour.
const headerOverPage = { headerTransparent: hasLiquidGlass };

// Native header options every narrow stack shares: one line, no hairline border.
const narrowOptions = {
  headerShadowVisible: false,
  ...headerOverPage,
  headerBackButtonDisplayMode: 'minimal',
  // A page below the shown one keeps its state but skips renders.
  freezeOnBlur: true,
  ...headerTitleOptions,
} satisfies StackProps['screenOptions'];

// A medium or wide window shows one page beside the list: it draws its own header, and a new page replaces the shown one without a transition.
const framedOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

function WebMenuButton(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <SectionMenuButton
      onOpen={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}

/*
 * A narrow section root's header on the stack: the web's JS header leads with ☰ and its attention dot; iOS takes the
 * title here, and the root page declares ☰, its items and its search as stock items (`SectionRoot`).
 */
const stackRootOptions = (
  header: SectionList['rootHeader'],
): NativeStackNavigationOptions =>
  Platform.OS === 'web'
    ? { headerLeft: () => <WebMenuButton />, ...screenHeaderOptions(header) }
    : screenHeaderOptions(header);

interface BannerProps {
  overHeader: boolean;
}

// Under a header that floats over the page, the banner moves down by the header's height, as the stack reports it.
function UnderHeaderBanner({ overHeader }: BannerProps): React.JSX.Element {
  const headerHeight = useAnimatedHeaderHeight();

  return (
    <PhoneConnectionBanner
      headerHeight={overHeader ? headerHeight : undefined}
    />
  );
}

// A compact page's Connection banner floats under its header; a medium or wide window's sits over the panes.
function NarrowBanner(props: BannerProps): React.JSX.Element | null {
  return useSizeClass() === 'compact' ? <UnderHeaderBanner {...props} /> : null;
}

// The page keeps its place in the tree at both widths.
const pageLayout: ScreenLayout = ({ children, options }) => (
  <View className="flex-1">
    {children}
    <NarrowBanner overHeader={options.headerTransparent === true} />
  </View>
);

interface SectionOptions {
  screenOptions: StackProps['screenOptions'];
  rootOptions: NativeStackNavigationOptions;
}

// The stack's options at this width, and its root's: a compact root shows the section's header; a medium or wide page draws its own.
function useSectionOptions(
  header: ScreenHeaderProps,
  root: boolean,
): SectionOptions {
  if (useSizeClass() !== 'compact')
    return { screenOptions: framedOptions, rootOptions: {} };

  return {
    screenOptions: narrowOptions,
    rootOptions: narrowRootOptions(header, root),
  };
}

function narrowRootOptions(
  header: ScreenHeaderProps,
  root: boolean,
): NativeStackNavigationOptions {
  if (!root) return screenHeaderOptions(header);

  return drawerDrawsRootHeader
    ? { headerShown: false }
    : stackRootOptions(header);
}

interface SectionStackProps extends PropsWithChildren {
  section: CoreSection;
}

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list under the section's header; a wide one shows the list beside it. Each page names itself through `ScreenHeader`.
export function SectionStack({
  section,
  children,
}: SectionStackProps): React.JSX.Element {
  return (
    <PageStack header={useSectionList(section).rootHeader}>
      {children}
    </PageStack>
  );
}

interface PageStackProps extends PropsWithChildren {
  header: ScreenHeaderProps;
  root?: boolean;
  rootName?: string;
  singular?: ComponentProps<typeof Stack.Screen>['dangerouslySingular'];
}

// Core lists and Plugin pages share stock stack headers, page placement and the Connection banner.
export function PageStack(props: PageStackProps): React.JSX.Element {
  const { screenOptions, rootOptions } = useSectionOptions(
    props.header,
    props.root ?? true,
  );

  return (
    <Stack screenOptions={screenOptions} screenLayout={pageLayout}>
      <Stack.Screen {...rootScreen(props, rootOptions)} />
      {props.children}
    </Stack>
  );
}

function rootScreen(
  props: PageStackProps,
  options: NativeStackNavigationOptions,
): ComponentProps<typeof Stack.Screen> {
  return {
    name: props.rootName ?? 'index',
    options,
    dangerouslySingular: props.singular,
  };
}
