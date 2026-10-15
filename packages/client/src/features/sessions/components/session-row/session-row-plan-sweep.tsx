import type * as React from 'react';
import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const sweepMilliseconds = 1600;

// The band's width, as a share of the filled part, and where it starts: just off the left end.
const bandPercent = 40;

// Where the band ends: past the right end of the filled part.
const endPercent = 100;

const forever = -1;

function sweep(position: SharedValue<number>): void {
  position.set(
    withRepeat(
      withTiming(endPercent, {
        duration: sweepMilliseconds,
        easing: Easing.linear,
      }),
      forever,
    ),
  );
}

function useSweepStyle(
  reducedMotion: boolean,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const position = useSharedValue(-bandPercent);

  useEffect(() => {
    position.set(-bandPercent);

    if (!reducedMotion) sweep(position);

    return (): void => cancelAnimation(position);
  }, [reducedMotion, position]);

  return useAnimatedStyle(() => ({ left: `${position.get()}%` }), [position]);
}

// A light band that runs along the filled part, left to right; reduced motion keeps the bar still.
export function PlanSweep(): React.JSX.Element | null {
  const reducedMotion = useReducedMotion();
  const style = useSweepStyle(reducedMotion);

  if (reducedMotion) return null;

  return (
    <Animated.View
      testID="session-plan-sweep"
      style={style}
      className="absolute inset-y-0 w-2/5 bg-card/60 dark:bg-foreground/30"
    />
  );
}
