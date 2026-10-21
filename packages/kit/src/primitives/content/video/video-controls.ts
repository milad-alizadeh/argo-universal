import { useState } from 'react';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';

// autoPlay plays muted and looping, and stays paused with Reduce Motion.
export function useMutedAutoPlay(autoPlay: boolean | undefined): boolean {
  const reducedMotion = useReducedMotionNow();

  return autoPlay === true && !reducedMotion;
}

export interface VideoControls {
  shown: boolean;
  reveal: () => void;
}

// An autoplaying video hides the player's controls until it is pressed.
export function useVideoControls(autoPlay: boolean): VideoControls {
  const [revealed, setRevealed] = useState(false);

  return {
    shown: !autoPlay || revealed,
    reveal: (): void => setRevealed(true),
  };
}
