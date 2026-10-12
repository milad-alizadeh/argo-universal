import { useLayoutEffect, useRef } from 'react';

const timing = { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

export interface ShellTransition<T> {
  value: T;
  // Only a change of key animates, so a window resize or a divider drag moves the shell at once.
  transitionKey: string;
  animate: boolean;
  // The keyframes for each element, from the value before the change to the value now.
  frames: (
    from: T,
    to: T,
  ) => readonly (readonly [HTMLElement | null, Keyframe[]])[];
}

// Plays the shell's open and close motion on the compositor-friendly properties the caller names; the inline style already holds the end state.
export function useShellTransition<T>({
  value,
  transitionKey,
  animate,
  frames,
}: ShellTransition<T>): void {
  const previous = useRef({ value, transitionKey });
  const motion = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { value, transitionKey };
    if (last.transitionKey === transitionKey) return;
    for (const animation of motion.current) animation.cancel();
    motion.current = [];
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    for (const [element, keyframes] of frames(last.value, value))
      if (element) motion.current.push(element.animate(keyframes, timing));
  });
  useLayoutEffect(
    () => (): void => {
      for (const animation of motion.current) animation.cancel();
    },
    [],
  );
}
