import { motionDuration } from '@repo/kit/motion';
import { useSpacing } from '@repo/kit/use-spacing';
import type { ViewStyle } from 'react-native';
import {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

const timing = {
  duration: motionDuration.enter,
  reduceMotion: ReduceMotion.System,
};

// Keep the collapsed header's bottom inset in step with its content's height.
export function useWorkbenchTitlePadding(
  expanded: boolean | undefined,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const inset = useSpacing('--spacing-3');
  const target = expanded === false ? inset : 0;
  const padding = useDerivedValue(() => withTiming(target, timing));

  return useAnimatedStyle<ViewStyle>(() => ({ paddingBottom: padding.value }));
}
