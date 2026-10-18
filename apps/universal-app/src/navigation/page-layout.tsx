import { PhoneConnectionBanner } from '@repo/client';
import { CompactScope, useSizeClass } from '@repo/client/size-class';
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

// A compact page's Connection banner floats under its header; a medium or wide window's sits over the panes.
function NarrowBanner(props: BannerProps): React.JSX.Element | null {
  return useSizeClass() === 'compact' ? <UnderHeaderBanner {...props} /> : null;
}

// The page keeps its place in the tree at every width; in a phone pane, every page but the section's root draws as on a phone.
export const pageLayout =
  (phonePane: boolean, rootName = 'index'): ScreenLayout =>
  ({ children, options, route }) => (
    <View className="flex-1">
      <CompactScope active={phonePane && route.name !== rootName}>
        {children}
      </CompactScope>
      <NarrowBanner overHeader={options.headerTransparent === true} />
    </View>
  );
