import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  type FrameInfo,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

/*
 * The sweep starts from Facebook Shimmer's defaults (FBShimmering.h, github.com/facebookarchive/Shimmer):
 * linear motion at shimmeringSpeed points a second, so a pass takes (fill + band) / speed seconds,
 * and shimmeringPauseDuration 0.4 seconds between passes. The owner tuned the speed from Shimmer's 230 to 270,
 * and the band below from 56 to 88.
 */
const pointsPerSecond = 270;

const pauseSeconds = 0.4;

const millisecondsPerSecond = 1000;

// The band runs on through the pause, out of sight, so the pause is a distance past the fill.
const pauseDistance = pointsPerSecond * pauseSeconds;

/*
 * shimmer-android's linear gradient with dropoff 0.5 keeps the outer quarters of the band clear
 * and ramps to the highlight and back across its middle half. The glint is that middle half.
 */
const bandWidth = 88;

const glintWidth = bandWidth / 2;

const glintInset = (bandWidth - glintWidth) / 2;

// How far the band's leading edge has run, wrapping to the start once the pause has passed.
function nextOffset(
  offset: number,
  elapsed: number,
  fillWidth: number,
): number {
  'worklet';

  const next = offset + (pointsPerSecond * elapsed) / millisecondsPerSecond;

  return next < fillWidth + bandWidth + pauseDistance ? next : 0;
}

// Moves the band at a steady speed on the UI thread, whatever the fill's width.
function useSweepOffset(fillWidth: SharedValue<number>): SharedValue<number> {
  const offset = useSharedValue(0);

  useFrameCallback(({ timeSincePreviousFrame }: FrameInfo) => {
    offset.set(
      nextOffset(offset.get(), timeSincePreviousFrame ?? 0, fillWidth.get()),
    );
  });

  return offset;
}

interface GlintProps {
  // The filled part's width, which the glint crosses.
  fillWidth: SharedValue<number>;
}

// Moves the glint by transform alone, so no frame lays the row out again; it waits right of the fill in the pause.
function useGlintStyle({
  fillWidth,
}: GlintProps): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const offset = useSweepOffset(fillWidth);

  return useAnimatedStyle(() => {
    const travelled = Math.min(offset.get(), fillWidth.get() + bandWidth);

    return {
      width: glintWidth,
      transform: [{ translateX: travelled - bandWidth + glintInset }],
    };
  }, [offset, fillWidth]);
}

// FBShimmering.h's shimmeringAnimationOpacity 0.5: the highlight peaks at half strength, clear at both ends.
const glintClassName =
  'absolute inset-y-0 left-0 bg-linear-to-r from-transparent via-card/50 to-transparent dark:via-foreground/50';

function Glint(props: GlintProps): React.JSX.Element {
  const style = useGlintStyle(props);

  return (
    <Animated.View
      testID="session-plan-sweep"
      style={style}
      className={glintClassName}
    />
  );
}

// A soft glint that runs along the filled part, left to right, then pauses; reduced motion keeps the bar still.
export function PlanSweep(props: GlintProps): React.JSX.Element | null {
  return useReducedMotion() ? null : <Glint {...props} />;
}
