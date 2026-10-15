import {
  hasLiquidGlass,
  ScreenHeaderProvider,
  type ScreenHeaderProps,
  useWide,
} from '@repo/client';
import { Stack, useRoute } from 'expo-router';
import type * as React from 'react';
import {
  type ComponentProps,
  type PropsWithChildren,
  useLayoutEffect,
} from 'react';
import { Platform } from 'react-native';
import { DrawerSectionHeader } from './drawer-section-header';
import { headerTitleOptions } from './header-title';
import { RootStackHeader } from './root-stack-header';
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

const sectionRoot = 'index';

// Android shows the root's header on its drawer screen; iOS and the web show it on the stack.
const drawerRootHeader = Platform.OS === 'android';

const rootOptions = { headerShown: !drawerRootHeader };

const RootHeader = Platform.select({
  android: DrawerSectionHeader,
  ios: RootStackHeader,
  default: WebScreenHeader,
});

// A narrow window's root sets its section's header; every other page sets its own stack header.
function NarrowHeader(header: ScreenHeaderProps): React.JSX.Element | null {
  const Header = useRoute().name === sectionRoot ? RootHeader : WebScreenHeader;

  return <Header {...header} />;
}

// A wide window's pages draw their own headers.
function NoHeader(): null {
  return null;
}

// Pages set their narrow header themselves and draw nothing there on a wide window, so a width change hides the header a narrow window left set.
function HeaderOnWideHidden({
  navigation,
  children,
}: Parameters<ScreenLayout>[0]): React.ReactElement {
  const wide = useWide();

  useLayoutEffect(() => {
    if (wide) navigation.setOptions({ headerShown: false });
  }, [navigation, wide]);

  return children;
}

const hiddenOnWide: ScreenLayout = (props) => <HeaderOnWideHidden {...props} />;

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list; a wide one shows the list beside it.
export function SectionStack({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <ScreenHeaderProvider header={useWide() ? NoHeader : NarrowHeader}>
      <SectionPages>{children}</SectionPages>
    </ScreenHeaderProvider>
  );
}

function SectionPages({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <Stack
      screenOptions={useWide() ? wideOptions : narrowOptions}
      screenLayout={hiddenOnWide}
    >
      <Stack.Screen name={sectionRoot} options={rootOptions} />
      {children}
    </Stack>
  );
}
