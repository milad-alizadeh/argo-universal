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
 * Every pass takes the same time on any bar, as in shimmer-android (Shimmer.java, github.com/facebookarchive/shimmer-android),
 * whose animationDuration of 1000 milliseconds is fixed whatever the view's width. The speed is (fill + band) / pass,
 * from the fill's width on each frame, so a fill that springs wider mid-pass speeds the band up.
 * Between passes it pauses for Facebook Shimmer's shimmeringPauseDuration of 0.4 seconds (FBShimmering.h).
 */
const passMilliseconds = 1000;

const pauseMilliseconds = 400;

// A cycle is one pass, then the pause; progress runs from 0 to 1 across the pass and on to the pause's end.
const cycleProgress = (passMilliseconds + pauseMilliseconds) / passMilliseconds;

/*
 * shimmer-android's linear gradient with dropoff 0.5 keeps the outer quarters of the band clear and ramps
 * to the highlight and back across its middle half. The glint is that middle half. The owner widened the band to 88.
 */
const bandWidth = 88;

const glintWidth = bandWidth / 2;

const glintInset = (bandWidth - glintWidth) / 2;

// How far through the cycle the band is, wrapping to the start once the pause has passed.
function nextProgress(progress: number, elapsed: number): number {
  'worklet';

  const next = progress + elapsed / passMilliseconds;

  return next < cycleProgress ? next : 0;
}

// Runs the cycle on the UI thread, linear in time.
function useSweepProgress(): SharedValue<number> {
  const progress = useSharedValue(0);

  useFrameCallback(({ timeSincePreviousFrame }: FrameInfo) => {
    progress.set(nextProgress(progress.get(), timeSincePreviousFrame ?? 0));
  });

  return progress;
}

interface GlintProps {
  // The filled part's width, which the glint crosses.
  fillWidth: SharedValue<number>;
}

// Moves the glint by transform alone, so no frame lays the row out again; it waits right of the fill in the pause.
function useGlintStyle({
  fillWidth,
}: GlintProps): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const progress = useSweepProgress();

  return useAnimatedStyle(() => {
    const travelled =
      Math.min(progress.get(), 1) * (fillWidth.get() + bandWidth);

    return {
      width: glintWidth,
      transform: [{ translateX: travelled - bandWidth + glintInset }],
    };
  }, [progress, fillWidth]);
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
