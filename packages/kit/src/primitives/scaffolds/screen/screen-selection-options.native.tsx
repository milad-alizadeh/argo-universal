import type { NativeStackNavigationOptions } from 'expo-router';
import { View } from 'react-native';
import type { SelectionMode } from '#kit/selection-mode';

// A phone's stack draws the selecting List's header in place of its own.
export function selectionOptions(
  mode?: SelectionMode | null,
): NativeStackNavigationOptions {
  const { header } = mode ?? {};

  return {
    header: header
      ? () => <View className="bg-content pt-safe">{header}</View>
      : undefined,
  };
}
