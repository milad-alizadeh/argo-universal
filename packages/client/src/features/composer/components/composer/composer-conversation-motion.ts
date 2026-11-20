import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { bezierEasing } from '@repo/kit/bezier-easing';
import { easingCurve, motionDuration } from '@repo/kit/motion';
import {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  type SharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type AnimatedStyle = ReturnType<typeof useAnimatedStyle>;

// The Composer's call motion runs whatever the system asks; reduced motion is answered with fades instead.
export const always = ReduceMotion.Never;

export const decelerate = bezierEasing(easingCurve.decelerate);

export const standard = bezierEasing(easingCurve.standard);

// A control springs in from 60% of its size with a little give.
const controlSpring = {
  damping: 15,
  stiffness: 220,
  mass: 1,
  reduceMotion: always,
};

const controlEntryScale = 0.6;

// A control comes in: a spring, or under reduced motion a plain fade.
export const controlIn = (still: boolean): number =>
  still
    ? withTiming(1, { duration: motionDuration.enter, reduceMotion: always })
    : withSpring(1, controlSpring);

// How far in a control is, as its opacity, clamped where the spring passes 1.
export const shownOpacity = (value: number): number => {
  'worklet';

  return interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP);
};

// The size a control grows to as it comes in.
export const shownScale = (value: number): number => {
  'worklet';

  return interpolate(value, [0, 1], [controlEntryScale, 1]);
};

// A control fading and growing in; under reduced motion it only fades.
export function useControlStyle(
  shown: SharedValue<number>,
  still: boolean,
): AnimatedStyle {
  return useAnimatedStyle(() => {
    const value = shown.get();

    return {
      opacity: shownOpacity(value),
      transform: [{ scale: still ? 1 : shownScale(value) }],
    };
  }, [shown, still]);
}

// The turning ring fades in round End as the call connects, and out as it connects or ends.
export const ringEntering = FadeIn.duration(motionDuration.enter).reduceMotion(
  always,
);

export const ringExiting = FadeOut.duration(motionDuration.exit).reduceMotion(
  always,
);
