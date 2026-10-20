import { useEffect, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type AnimatedStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

// Just short of critical damping: the page carries weight and settles without bouncing back.
const slide = {
  mass: 1,
  stiffness: 200,
  damping: 26,
  reduceMotion: ReduceMotion.System,
};

/*
 * The pages sit side by side in one row, and the row slides by a page's width for each page pushed over the
 * root. The transform is the whole animation, so a page already drawn is never laid out again to move it.
 */
export function useSlide(depth: number, width: number): AnimatedStyle {
  const offset = useSharedValue(-depth * width);

  useEffect(() => {
    offset.set(withSpring(-depth * width, slide));
  }, [offset, depth, width]);

  return useAnimatedStyle(
    () => ({ transform: [{ translateX: offset.get() }] }),
    [offset],
  );
}

/*
 * Long enough for the spinner to be read rather than flashed. A pushed page's content is built as the page
 * is, so without the wait the slide would carry a list still measuring itself (owner, 2026-10-20).
 */
const settleDelay = 250;

// The root page is drawn before the sheet is shown, so only a pushed page waits.
export function useSettled(root: boolean): boolean {
  const [settled, setSettled] = useState(root);

  useEffect(() => {
    if (root) return;

    const timer = setTimeout(() => setSettled(true), settleDelay);

    return (): void => clearTimeout(timer);
  }, [root]);

  return settled;
}
