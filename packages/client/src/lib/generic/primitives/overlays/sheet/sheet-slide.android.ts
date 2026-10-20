import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type AnimatedStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

/*
 * Android's own page transition: 300ms on the platform's standard curve, the motion a Fragment or a
 * Compose destination slides across with. A spring carried the page for 860ms instead — three times
 * longer than anything else on the platform, and long enough that its tail was still moving when the
 * page's list mounted into it (owner, 2026-10-21).
 */
// Material’s standard easing, the curve Compose calls FastOutSlowIn.
const fastOut = 0.4,
  slowIn = 0.2;

const standardEasing = Easing.bezier(fastOut, 0, slowIn, 1);

const slide = {
  duration: 300,
  easing: standardEasing,
  reduceMotion: ReduceMotion.System,
};

export interface Slide {
  style: AnimatedStyle;
  // Whether the row is standing still. A pushed page draws its own rows only once it has stopped moving.
  settled: boolean;
}

/*
 * The pages sit side by side in one row, and the row slides by a page's width for each page pushed over the
 * root. The transform is the whole animation, so a page already drawn is never laid out again to move it.
 */
export function useSlide(depth: number, width: number): Slide {
  const offset = useSharedValue(-depth * width);
  const [settled, setSettled] = useState(true);
  const settle = useCallback(() => setSettled(true), []);
  const shown = useRef(depth);

  useEffect(() => {
    if (shown.current === depth) return offset.set(-depth * width);

    shown.current = depth;
    setSettled(false);
    offset.set(withTiming(-depth * width, slide, finish(settle)));
  }, [offset, depth, width, settle]);

  return { style: useSlideStyle(offset), settled };
}

/*
 * The slide's own end, rather than a guess at how long it takes: the page swaps its placeholder for its
 * rows on the frame after the motion stops, so the commit never lands mid-travel. An interrupted slide
 * leaves the placeholder up, because the slide that interrupted it reports its own end.
 */
const finish =
  (settle: () => void) =>
  (finished?: boolean): void => {
    'worklet';

    if (finished) runOnJS(settle)();
  };

function useSlideStyle(
  offset: ReturnType<typeof useSharedValue<number>>,
): AnimatedStyle {
  return useAnimatedStyle(
    () => ({ transform: [{ translateX: offset.get() }] }),
    [offset],
  );
}
