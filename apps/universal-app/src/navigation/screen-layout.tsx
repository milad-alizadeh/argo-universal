import { ScreenBesideList, PhoneConnectionBanner } from '@repo/client';
import { useWide } from '@repo/client/size-class';
import type { Stack } from 'expo-router';
import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { ReturnToOrigin } from './return-destination';
import { RepairDeepLinkStack } from './section-root';

type ScreenLayout = NonNullable<ComponentProps<typeof Stack>['screenLayout']>;

interface BannerProps {
  overHeader: boolean;
}

// Under a header that floats over the screen, the banner moves down by the header's height, as the stack reports it.
function UnderHeaderBanner({ overHeader }: BannerProps): React.JSX.Element {
  const headerHeight = useAnimatedHeaderHeight();

  return (
    <PhoneConnectionBanner
      headerHeight={overHeader ? headerHeight : undefined}
    />
  );
}

// The phone shell's Connection banner floats under the screen's header; a wide window's sits over the panes.
function NarrowBanner(props: BannerProps): React.JSX.Element | null {
  return useWide() ? null : <UnderHeaderBanner {...props} />;
}

// A screen under another screen of its section, such as a Project under Projects, which keeps its Back beside the list.
const nestedScreen = (route: { name: string }): boolean =>
  route.name.includes('/') && !route.name.endsWith('/index');

// A wide window shows a page beside its list with no Back to return with.
function NarrowReturn(): React.JSX.Element | null {
  return useWide() ? null : <ReturnToOrigin />;
}

// The screen keeps its place in the tree at every width.
export const screenLayout: ScreenLayout = ({ children, options, route }) => (
  <View className="flex-1">
    <ScreenBesideList value={!nestedScreen(route)}>{children}</ScreenBesideList>
    <NarrowBanner overHeader={options.headerTransparent === true} />
    <NarrowReturn />
    <RepairDeepLinkStack />
  </View>
);
