import {
  hasLiquidGlass,
  type ScreenHeaderProps,
  ScreenHeaderProvider,
} from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { useHeaderTitleOptions } from './header-title';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// A phone section's native stack; its screens set their header through ScreenHeader.
export function PhoneStack({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const titleOptions = useHeaderTitleOptions();
  return (
    <ScreenHeaderProvider header={NativeScreenHeader}>
      <Stack screenOptions={{ ...screenOptions, ...titleOptions }}>
        {children}
      </Stack>
    </ScreenHeaderProvider>
  );
}

function NativeScreenHeader({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLeft: left ? () => left : undefined,
          ...(hasLiquidGlass
            ? // Separate items, so each gets its own glass bubble.
              {
                unstable_headerRightItems: () => separateItems(right ?? []),
              }
            : {
                headerRight: right
                  ? (): React.JSX.Element => (
                      <View className="flex-row gap-1">{right}</View>
                    )
                  : undefined,
              }),
          // Android has no search yet; its header SearchView misdraws.
          headerSearchBarOptions:
            search && Platform.OS !== 'android'
              ? {
                  placeholder: search.placeholder,
                  placement: 'integrated',
                  autoCapitalize: 'none',
                  hideWhenScrolling: false,
                  onChangeText: ({ nativeEvent }) =>
                    search.onChangeText(nativeEvent.text),
                  onCancelButtonPress: () => search.onChangeText(''),
                  onClose: () => search.onChangeText(''),
                }
              : undefined,
        }}
      />
      {/* iOS 26 puts the search bar at the bottom, in the thumb's reach. */}
      {search && hasLiquidGlass && (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
        </Stack.Toolbar>
      )}
    </>
  );
}

// Spaced items, so iOS 26 draws each in its own glass bubble.
function separateItems(
  elements: readonly ReactElement[],
): (
  | { type: 'custom'; element: ReactElement; spacing?: never }
  | { type: 'spacing'; spacing: number; index: number }
)[] {
  const items = elements.flatMap((element, index) => [
    ...(index > 0 ? [{ type: 'spacing' as const, spacing: 8 }] : []),
    { type: 'custom' as const, element },
  ]);
  // The native side inserts a spacer at its index in the reversed list, which expo-router leaves unset.
  return items.map((item, index) =>
    item.type === 'spacing'
      ? { ...item, index: items.length - 1 - index }
      : item,
  );
}
