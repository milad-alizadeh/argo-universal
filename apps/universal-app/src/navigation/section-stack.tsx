import { hasLiquidGlass, type CoreSection, sections } from '@repo/client';
import { useWide } from '@repo/client/size-class';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { screenLayout } from './screen-layout';

type StackProps = ComponentProps<typeof Stack>;

// With Liquid Glass, content scrolls under a clear header; before it, the opaque header takes the theme's content colour.
const headerOverPage = { headerTransparent: hasLiquidGlass };

// Native header options every narrow stack shares: one line, no hairline border.
const narrowOptions = {
  headerShadowVisible: false,
  ...headerOverPage,
  headerBackButtonDisplayMode: 'minimal',
  // A page below the shown one keeps its state but skips renders.
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

// A wide window shows one page beside the list: it draws its own header, and a new page replaces the shown one without a transition.
const framedOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

interface SectionStackProps extends PropsWithChildren {
  section: CoreSection;
}

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list; a wide one shows the list beside it. Each page declares its header through its `Screen`.
export function SectionStack({
  section,
  children,
}: SectionStackProps): React.JSX.Element {
  return <ScreenStack title={sections[section].title}>{children}</ScreenStack>;
}

interface ScreenStackProps extends PropsWithChildren {
  // The root's title until its Screen mounts, so the web header never shows the route's name.
  title: string;
  rootName?: string;
  fullScreenGestureEnabled?: boolean;
  singular?: ComponentProps<typeof Stack.Screen>['dangerouslySingular'];
}

// Core lists and Plugin pages share stock stack headers, page placement and the Connection banner.
export function ScreenStack(props: ScreenStackProps): React.JSX.Element {
  const wide = useWide();

  const screenOptions = {
    ...(wide ? framedOptions : narrowOptions),
    fullScreenGestureEnabled: props.fullScreenGestureEnabled,
  };

  return (
    <Stack screenOptions={screenOptions} screenLayout={screenLayout}>
      <Stack.Screen {...rootScreen(props, wide)} />
      {props.children}
    </Stack>
  );
}

function rootScreen(
  props: ScreenStackProps,
  wide: boolean,
): ComponentProps<typeof Stack.Screen> {
  const options: NativeStackNavigationOptions = wide
    ? {}
    : { title: props.title };

  return {
    name: props.rootName ?? 'index',
    options,
    dangerouslySingular: props.singular,
  };
}

/*
 * The route for pages a component pushes over the Frame (`app/screen/[id]`): a narrow window's stock header, with Back.
 * It is a screen of the root stack, not of a stack of its own: the first screen of a nested stack has nothing below it
 * to go back to, so its header drew a title and no Back (#1740).
 */
export const pushedScreen = {
  name: 'screen/[id]',
  options: { ...narrowOptions, headerShown: true },
} satisfies ComponentProps<typeof Stack.Screen>;

// The root stack's layout: a pushed page gets the section screens' (Connection banner, return to origin); every other root screen draws itself.
export const rootScreenLayout: NonNullable<StackProps['screenLayout']> = (
  props,
) =>
  props.route.name === pushedScreen.name ? screenLayout(props) : props.children;
