import type { ImageStep } from '../view/feed-images';

// Only the web hears a keyboard's arrow keys.
export function useImageStepKeys(
  _open: boolean,
  _onStep: (step: ImageStep) => void,
): void {}
