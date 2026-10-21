import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
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

/*
 * The transition rather than the places: which place the sheet is leaving, which it is going to, and how far
 * along it is. Every page reads the same three and works out where it stands, so only the two places the
 * reader travels between ever move, however many places apart they sit.
 */
interface Places {
  from: number;
  to: number;
}

export interface SlideMotion {
  from: SharedValue<number>;
  to: SharedValue<number>;
  progress: SharedValue<number>;
}

export interface Slide {
  motion: SlideMotion;
  // Whether the pages are standing still. A pushed page draws its own rows only once it has stopped moving.
  settled: boolean;
}

export function useSlide(slot: number): Slide {
  const motion = useMotion(slot);
  const [settled, setSettled] = useState(true);

  useTravel(motion, slot, setSettled);

  return { motion, settled };
}

function useMotion(slot: number): SlideMotion {
  const from = useSharedValue(slot);
  const to = useSharedValue(slot);
  const progress = useSharedValue(1);

  return useMemo(() => ({ from, to, progress }), [from, to, progress]);
}

/*
 * A slide interrupted part way is taken from the place it was going to rather than the point it had reached:
 * the pair of places is what each page animates between, and there is no pair to be read off a page halfway
 * across. The pages that are not of that pair take their new place on the frame the travel starts, both of
 * them off screen, so nothing of the jump is seen.
 */
function useTravel(
  motion: SlideMotion,
  slot: number,
  setSettled: (settled: boolean) => void,
): void {
  const shown = useRef(slot);
  const settle = useCallback(() => setSettled(true), [setSettled]);

  useEffect(() => {
    if (shown.current === slot) return;

    travel(motion, { from: shown.current, to: slot }, settle);
    shown.current = slot;
    setSettled(false);
  }, [motion, slot, settle, setSettled]);
}

function travel(motion: SlideMotion, places: Places, settle: () => void): void {
  motion.from.set(places.from);
  motion.to.set(places.to);
  motion.progress.set(0);
  motion.progress.set(withTiming(1, slide, finish(settle)));
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

/*
 * Where a page stands, in screen widths from the one the reader is on: nought for that page, and a whole
 * width to one side or the other for every other page, whichever side it lies on. Only the page being left
 * and the page being gone to travel; the rest are already parked off screen and stay there.
 */
function offsetAt(index: number, places: Places, progress: number): number {
  'worklet';

  if (index === places.to)
    return Math.sign(index - places.from) * (1 - progress);

  if (index === places.from) return Math.sign(index - places.to) * progress;

  return Math.sign(index - places.to);
}

export function usePageSlide(
  motion: SlideMotion,
  index: number,
  width: number,
): AnimatedStyle {
  return useAnimatedStyle(() => {
    const places = { from: motion.from.get(), to: motion.to.get() };
    const offset = offsetAt(index, places, motion.progress.get());

    // The pages are laid out side by side, so a page's own place in the row comes off where it is to stand.
    return { transform: [{ translateX: (offset - index) * width }] };
  }, [motion, index, width]);
}
