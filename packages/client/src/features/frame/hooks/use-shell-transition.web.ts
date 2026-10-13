import { type RefObject, useLayoutEffect, useRef } from 'react';

// The shell's one open and close motion.
export const shellTiming = {
  duration: 280,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export type ElementFrame = readonly [HTMLElement | null, Keyframe[]];

export interface ShellTransition<T> {
  value: T;
  // Only a change of key animates, so a window resize or a divider drag moves the shell at once.
  transitionKey: string;
  animate: boolean;
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

export function playFrames(frames: readonly ElementFrame[]): Animation[] {
  return frames.flatMap(([element, keyframes]) =>
    element ? [element.animate(keyframes, shellTiming)] : [],
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

// Plays the shell's open and close motion on the compositor-friendly properties the caller names; the inline style already holds the end state.
export function useShellTransition<T>({
  value,
  transitionKey,
  animate,
  frames,
}: ShellTransition<T>): void {
  const motion = useRef<Animation[]>([]);
  useCancelOnUnmount(motion);
  useKeyChange(value, transitionKey, (from) => {
    cancelMotion(motion.current);
    motion.current = mayAnimate(animate) ? playFrames(frames(from, value)) : [];
  });
}
