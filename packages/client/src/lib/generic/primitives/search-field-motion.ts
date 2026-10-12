import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Extrapolation,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { quarterTurnDegrees } from '../motion';

// Paper's SearchField motion: one spring opens, a firmer one closes so the field settles without a bounce.
const spring = { mass: 1, stiffness: 360, reduceMotion: ReduceMotion.System };
const openingDamping = 31;
const closingDamping = 36;

// Where the lens settles inside the open field: 12 of padding plus half the 16 glyph.
const fieldLensCentre = 20;
// The lens swells from 16 to 18 mid-flight, as if lifted while it travels.
const lensLift = 0.125;
const titleShift = 8;
const closeStartScale = 0.6;
// Where in the travel each part fades, from 0 closed to 1 open.
const restGone = 0.4;
const surfaceShown = 0.55;
const textStarts = 0.5;
const textShown = 0.75;
const closeAppearing = 0.4;

export interface SearchFieldGeometry {
  // The row's width, which the open field fills.
  rowWidth: number;
  // The search button's width, where the field grows from.
  triggerWidth: number;
}

type AnimatedStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

export function useSearchProgress(open: boolean): SharedValue<number> {
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    const damping = open ? openingDamping : closingDamping;
    progress.set(withSpring(open ? 1 : 0, { ...spring, damping }));
  }, [open, progress]);
  return progress;
}

// The title and other actions fade and drift left as the field takes their place.
export function useRestStyle(progress: SharedValue<number>): AnimatedStyle {
  return useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, restGone], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: -titleShift * Math.min(p, 1) }],
    };
  }, [progress]);
}

// The surface grows leftwards from the search button to the whole row.
export function useSurfaceStyle(
  progress: SharedValue<number>,
  geometry: SearchFieldGeometry,
): AnimatedStyle {
  const { rowWidth, triggerWidth } = geometry;
  return useAnimatedStyle(() => {
    const p = Math.min(progress.get(), 1);
    return {
      width: triggerWidth + (rowWidth - triggerWidth) * p,
      opacity: interpolate(p, [0, surfaceShown], [0, 1], Extrapolation.CLAMP),
    };
  }, [progress, rowWidth, triggerWidth]);
}

// The lens rides the surface's leading edge from the button to its place in the field.
export function useLensStyle(
  progress: SharedValue<number>,
  geometry: SearchFieldGeometry,
): AnimatedStyle {
  const restCentre = geometry.rowWidth - geometry.triggerWidth / 2;
  return useAnimatedStyle(() => {
    const p = Math.min(progress.get(), 1);
    return {
      transform: [
        { translateX: -(restCentre - fieldLensCentre) * p },
        { scale: 1 + lensLift * Math.sin(Math.PI * p) },
      ],
    };
  }, [progress, restCentre]);
}

// Typed text and placeholder appear once the surface is nearly open.
export function useTextStyle(progress: SharedValue<number>): AnimatedStyle {
  return useAnimatedStyle(
    () => ({
      opacity: interpolate(
        progress.get(),
        [textStarts, textShown],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }),
    [progress],
  );
}

// Close turns in from a quarter turn as it grows, and is not drawn at all while the field is shut.
export function useCloseStyle(progress: SharedValue<number>): AnimatedStyle {
  return useAnimatedStyle(() => {
    const p = Math.min(progress.get(), 1);
    return {
      display: p > 0 ? 'flex' : 'none',
      opacity: interpolate(p, [closeAppearing, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { rotate: `${-quarterTurnDegrees * (1 - p)}deg` },
        { scale: closeStartScale + (1 - closeStartScale) * p },
      ],
    };
  }, [progress]);
}
