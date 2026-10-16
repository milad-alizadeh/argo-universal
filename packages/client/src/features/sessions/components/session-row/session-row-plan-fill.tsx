import { useEffect } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/*
 * Material 3's ProgressIndicatorDefaults.ProgressAnimationSpec: a spring with dampingRatio 1 (no bounce)
 * and stiffness StiffnessVeryLow (50). Reanimated takes the ratio as damping = ratio * 2 * sqrt(stiffness * mass),
 * its springUtils' zeta = c / (2 * sqrt(k * m)). Compose's visibilityThreshold of 1/1000 has no Reanimated
 * counterpart; the spring stops at Reanimated's default energyThreshold.
 */
const veryLowStiffness = 50;

const mass = 1;

const progressSpring = {
  stiffness: veryLowStiffness,
  mass,
  damping: 2 * Math.sqrt(veryLowStiffness * mass),
} as const;

export interface PlanFillWidth {
  // The filled part's width, in points, on the UI thread.
  fillWidth: SharedValue<number>;
  // Reads the track's width, which the fill is a share of.
  measure: (event: LayoutChangeEvent) => void;
}

// The done share shown: the progress spring when it changes, a jump under reduced motion.
function useShownShare(share: number): SharedValue<number> {
  const reducedMotion = useReducedMotion();
  const shown = useSharedValue(share);

  useEffect(() => {
    shown.set(reducedMotion ? share : withSpring(share, progressSpring));
  }, [share, reducedMotion, shown]);

  return shown;
}

export function usePlanFillWidth(share: number): PlanFillWidth {
  const trackWidth = useSharedValue(0);
  const shown = useShownShare(share);

  // The dependencies are listed, since web has no worklet closure to find them in.
  const fillWidth = useDerivedValue(
    () => trackWidth.get() * shown.get(),
    [trackWidth, shown],
  );

  return {
    fillWidth,
    measure: (event) => trackWidth.set(event.nativeEvent.layout.width),
  };
}

// Sets the fill's width on the UI thread, so a growing fill never re-renders the row.
export function usePlanFillStyle(
  fillWidth: SharedValue<number>,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  return useAnimatedStyle(() => ({ width: fillWidth.get() }), [fillWidth]);
}
