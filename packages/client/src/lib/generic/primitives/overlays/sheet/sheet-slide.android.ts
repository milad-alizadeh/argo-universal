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
 * The pages sit side by side in one row, and the row slides by a page's width for each place between the
 * one it rests at and the one the reader is going to. The transform is the whole animation, so a page
 * already drawn is never laid out again to move it.
 */
export function useSlide(slot: number, width: number): Slide {
  const offset = useSharedValue(-slot * width);
  const [settled, setSettled] = useState(true);
  const settle = useCallback(() => setSettled(true), []);
  const shown = useRef(slot);

  useEffect(() => {
    if (shown.current === slot) return offset.set(-slot * width);

    shown.current = slot;
    setSettled(false);
    offset.set(withTiming(-slot * width, slide, finish(settle)));
  }, [offset, slot, width, settle]);

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
