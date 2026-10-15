import {
  hasLiquidGlass,
  PhoneConnectionBanner,
  ScreenHeaderProvider,
  type Section,
  useSectionRootHeaders,
  useWide,
} from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { View } from 'react-native';
import { sectionRoot } from './drawer-sections';
import { headerTitleOptions } from './header-title';
import { stackRootOptions } from './section-root-options';
import { WebScreenHeader } from './web-screen-header';

type StackProps = ComponentProps<typeof Stack>;

type ScreenLayout = NonNullable<StackProps['screenLayout']>;

// Native header options every narrow stack shares: one line, no hairline border.
const narrowOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
  // A page below the shown one keeps its state but skips renders.
  freezeOnBlur: true,
  ...headerTitleOptions,
} satisfies StackProps['screenOptions'];

// A wide window shows one page beside the list: it draws its own header, and a new page replaces the shown one without a transition.
const wideOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

// A narrow page's Connection banner floats under its header; a wide window's sits over the panes.
function NarrowBanner({
  overHeader,
}: {
  overHeader: boolean;
}): React.JSX.Element | null {
  return useWide() ? null : <PhoneConnectionBanner overHeader={overHeader} />;
}

// The page keeps its place in the tree at both widths.
const pageLayout: ScreenLayout = ({ children, options }) => (
  <View className="flex-1">
    {children}
    <NarrowBanner overHeader={options.headerTransparent === true} />
  </View>
);

// The stack's options at this width, and its root's: a narrow root shows the section's header; a wide page draws its own.
function useSectionOptions(section: Section): {
  screenOptions: StackProps['screenOptions'];
  rootOptions: NativeStackNavigationOptions;
} {
  const wide = useWide();
  const header = useSectionRootHeaders()[section];

  return wide
    ? { screenOptions: wideOptions, rootOptions: {} }
    : { screenOptions: narrowOptions, rootOptions: stackRootOptions(header) };
}

interface SectionStackProps extends PropsWithChildren {
  section: Section;
}

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list under the section's header; a wide one shows the list beside it. Pages in @repo/client set a narrow web header through `ScreenHeader`.
export function SectionStack({
  section,
  children,
}: SectionStackProps): React.JSX.Element {
  const { screenOptions, rootOptions } = useSectionOptions(section);

  return (
    <ScreenHeaderProvider header={WebScreenHeader}>
      <Stack screenOptions={screenOptions} screenLayout={pageLayout}>
        <Stack.Screen name={sectionRoot} options={rootOptions} />
        {children}
      </Stack>
    </ScreenHeaderProvider>
  );
}
