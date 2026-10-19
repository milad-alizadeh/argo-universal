import { PhoneConnectionBanner, ScreenInspector } from '@repo/client';
import { useWide } from '@repo/client/size-class';
import type { Stack } from 'expo-router';
import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

type ScreenLayout = NonNullable<ComponentProps<typeof Stack>['screenLayout']>;

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

// The phone shell's Connection banner floats under the page's header; a wide window's sits over the panes.
function NarrowBanner(props: BannerProps): React.JSX.Element | null {
  return useWide() ? null : <UnderHeaderBanner {...props} />;
}

// The page keeps its place in the tree at every width; while shown, its Inspector draws in the Frame's column.
export const pageLayout: ScreenLayout = ({ children, options }) => (
  <View className="flex-1">
    <ScreenInspector>{children}</ScreenInspector>
    <NarrowBanner overHeader={options.headerTransparent === true} />
  </View>
);
