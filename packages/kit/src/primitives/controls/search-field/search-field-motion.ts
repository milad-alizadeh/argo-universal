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
import { quarterTurnDegrees } from '../../../motion';

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
  // How far the search button's right edge sits in from the row's: 0 when it ends the row.
  triggerInset: number;
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
  });
}

// The surface grows from the search button to the whole row: leftwards, and rightwards over any actions after it.
export function useSurfaceStyle(
  progress: SharedValue<number>,
  geometry: SearchFieldGeometry,
): AnimatedStyle {
  const { rowWidth, triggerWidth, triggerInset } = geometry;

  return useAnimatedStyle(() => {
    const p = Math.min(progress.get(), 1);

    return {
      right: triggerInset * (1 - p),
      width: triggerWidth + (rowWidth - triggerWidth) * p,
      opacity: interpolate(p, [0, surfaceShown], [0, 1], Extrapolation.CLAMP),
    };
  });
}

// The search button's centre, from the row's left.
const lensRestCentre = (geometry: SearchFieldGeometry): number =>
  geometry.rowWidth - geometry.triggerInset - geometry.triggerWidth / 2;

// The lens rides the surface's leading edge from the button to its place in the field.
export function useLensStyle(
  progress: SharedValue<number>,
  geometry: SearchFieldGeometry,
): AnimatedStyle {
  const restCentre = lensRestCentre(geometry);

  return useAnimatedStyle(() => {
    const p = Math.min(progress.get(), 1);

    return {
      transform: [
        { translateX: -(restCentre - fieldLensCentre) * p },
        { scale: 1 + lensLift * Math.sin(Math.PI * p) },
      ],
    };
  });
}

// Typed text and placeholder appear once the surface is nearly open.
export function useTextStyle(progress: SharedValue<number>): AnimatedStyle {
  return useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [textStarts, textShown],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
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
  });
}
