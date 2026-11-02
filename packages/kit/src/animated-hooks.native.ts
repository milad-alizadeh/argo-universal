import type { DependencyList } from 'react';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import {
  type SharedValue,
  useAnimatedReaction as useReanimatedReaction,
  useAnimatedStyle as useReanimatedStyle,
  useDerivedValue as useReanimatedDerivedValue,
} from 'react-native-reanimated';

// The Babel plugin collects a worklet's closure on native, and Reanimated warns about a dependency array there, so it is dropped.
export function useAnimatedStyle<
  Style extends ViewStyle | ImageStyle | TextStyle,
>(
  updater: () => Style,
  _dependencies?: DependencyList | null,
): ReturnType<typeof useReanimatedStyle<Style>> {
  return useReanimatedStyle(updater);
}

export function useDerivedValue<Value>(
  updater: () => Value,
  _dependencies?: DependencyList,
): SharedValue<Value> {
  return useReanimatedDerivedValue(updater);
}

export function useAnimatedReaction<Prepared>(
  prepare: () => Prepared,
  react: (prepared: Prepared, previous: Prepared | null) => void,
  _dependencies?: DependencyList,
): void {
  useReanimatedReaction(prepare, react);
}
