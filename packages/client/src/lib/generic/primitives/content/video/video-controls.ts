import { useState } from 'react';
import { useReducedMotionNow } from '#lib/generic/use-reduced-motion-now';

// autoPlay plays muted and looping, and stays paused with Reduce Motion.
export function useQuietPlay(autoPlay: boolean | undefined): boolean {
  const reducedMotion = useReducedMotionNow();

  return autoPlay === true && !reducedMotion;
}

export interface VideoControls {
  shown: boolean;
  reveal: () => void;
}

// A quiet video hides the player's controls until it is pressed.
export function useVideoControls(quiet: boolean): VideoControls {
  const [revealed, setRevealed] = useState(false);

  return { shown: !quiet || revealed, reveal: (): void => setRevealed(true) };
}
