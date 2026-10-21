import { cssTransition } from '@repo/kit/motion';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { FrameMotion, FrameTiming } from '../utils/frame-timing';

export type ElementFrame = readonly [HTMLElement | null, Keyframe[]];

export interface FrameTransition<T> extends FrameMotion {
  value: T;
  // The keyframes for each element, from the value before the change to the value now.
  frames: (from: T, to: T) => readonly ElementFrame[];
}

export function cancelMotion(motion: readonly Animation[]): void {
  for (const animation of motion) animation.cancel();
}

export function mayAnimate(animate: boolean): boolean {
  return animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCancelOnUnmount(motion: RefObject<Animation[]>): void {
  useLayoutEffect(() => (): void => cancelMotion(motion.current), [motion]);
}

export function playFrames(
  frames: readonly ElementFrame[],
  { duration, curve }: FrameTiming,
): Animation[] {
  const timing = cssTransition(duration, curve);

  return frames.flatMap(([element, keyframes]) =>
    element ? [element.animate(keyframes, timing)] : [],
  );
}

function useKeyChange<T>(
  value: T,
  transitionKey: string,
  onChange: (from: T) => void,
): void {
  const previous = useRef({ value, transitionKey });
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { value, transitionKey };

    if (last.transitionKey !== transitionKey) onChange(last.value);
  });
}

// Plays the Frame's open and close motion on the properties the caller names; the inline style already holds the end state.
export function useFrameTransition<T>(transition: FrameTransition<T>): void {
  const { value, animate, timing, frames } = transition;
  const motion = useRef<Animation[]>([]);
  useCancelOnUnmount(motion);
  useKeyChange(value, transition.transitionKey, (from) => {
    cancelMotion(motion.current);
    motion.current = mayAnimate(animate)
      ? playFrames(frames(from, value), timing)
      : [];
  });
}
