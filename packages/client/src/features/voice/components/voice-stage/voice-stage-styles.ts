import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import {
  Extrapolation,
  interpolate,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import type { StageReveal } from './voice-stage-motion';

// How far the drawing and its label have come in; without it they are drawn in place.
export type StageShown = Pick<StageReveal, 'orb' | 'label' | 'still'>;

// One part of the stage: how far it has come in, and whether it only fades, for reduced motion.
export type Shown = { shown: SharedValue<number>; still: boolean };

// The drawing grows from 60% of its size as it springs in, and swells by 4% at the top of each breath while it connects.
const orbEntryScale = 0.6;

const breathScale = 0.04;

// A connecting drawing dims a little as it breathes out, so it reads as working rather than paused.
const breathDim = 0.18;

// The label rises 8 points into place behind the drawing.
const labelRise = 8;

const clamp = Extrapolation.CLAMP;

export function useOrbStyle(
  orb: SharedValue<number>,
  breath: SharedValue<number>,
  still: boolean,
): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => {
    const shown = orb.get();
    const entry = still ? 1 : interpolate(shown, [0, 1], [orbEntryScale, 1]);

    return {
      opacity: Math.min(1, shown) * (1 - breathDim * breath.get()),
      transform: [{ scale: entry * (1 + breathScale * breath.get()) }],
    };
  }, [orb, breath, still]);
}

export function useLabelStyle(
  label: SharedValue<number>,
  still: boolean,
): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => {
    const shown = label.get();
    const rise = interpolate(shown, [0, 1], [labelRise, 0], clamp);

    return { opacity: shown, transform: [{ translateY: still ? 0 : rise }] };
  }, [label, still]);
}

// Drawn in place, for a stage nothing brings in.
export function useRevealOrInPlace(reveal: StageShown | undefined): StageShown {
  const inPlace = useSharedValue(1);

  return reveal ?? { orb: inPlace, label: inPlace, still: false };
}
