import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { maximumPlanStepsHeight } from '../state/status';

const revealTiming = { duration: 200, easing: Easing.out(Easing.cubic) };

function useRevealHeight(
  expanded: boolean,
  stepsHeight: number,
): SharedValue<number> {
  const revealHeight = useSharedValue(0);
  useEffect(() => {
    revealHeight.set(withTiming(expanded ? stepsHeight : 0, revealTiming));

    return (): void => cancelAnimation(revealHeight);
  }, [expanded, stepsHeight, revealHeight]);

  return revealHeight;
}

interface PlanReveal {
  expanded: boolean;
  toggle: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  style: ReturnType<typeof useRevealStyle>;
}

function useRevealStyle(
  revealHeight: SharedValue<number>,
): ReturnType<typeof useAnimatedStyle<{ height: number; opacity: number }>> {
  return useAnimatedStyle(
    () => ({
      height: revealHeight.get(),
      opacity: revealHeight.get() === 0 ? 0 : 1,
    }),
    [revealHeight],
  );
}

export function usePlanReveal(): PlanReveal {
  const [expanded, setExpanded] = useState(false);
  const [stepsHeight, setStepsHeight] = useState(0);
  const revealHeight = useRevealHeight(expanded, stepsHeight);
  const style = useRevealStyle(revealHeight);
  const toggle = (): void => setExpanded(!expanded);

  const onLayout = (event: LayoutChangeEvent): void =>
    setStepsHeight(
      Math.min(maximumPlanStepsHeight, event.nativeEvent.layout.height),
    );

  return { expanded, toggle, onLayout, style };
}
