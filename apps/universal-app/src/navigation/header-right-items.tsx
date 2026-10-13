import { hasLiquidGlass } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

type ScreenOptions = NativeStackNavigationOptions;

// The header's trailing items, in order.
export function rightItems(right: readonly ReactElement[]): ScreenOptions {
  // Separate items, so each gets its own glass bubble.
  if (hasLiquidGlass)
    return { unstable_headerRightItems: () => separateItems(right) };

  if (!right.length) return {};

  return {
    headerRight: (): React.JSX.Element => (
      // iOS ends the last 32pt item's glyph at the screen inset, in line with the search bar.
      <View className="flex-row gap-1 ios:-mr-1.5">{right}</View>
    ),
  };
}

type HeaderRightItem =
  | { type: 'custom'; element: ReactElement; spacing?: never }
  | { type: 'spacing'; spacing: number; index: number };

// Spaced items, so iOS 26 draws each in its own glass bubble.
function separateItems(elements: readonly ReactElement[]): HeaderRightItem[] {
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
