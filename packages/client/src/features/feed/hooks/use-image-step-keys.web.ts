import { useEffect, useEffectEvent } from 'react';
import type { ImageStep } from '../view/feed-images';

const steps = new Map<string, ImageStep>([
  ['ArrowLeft', -1],
  ['ArrowRight', 1],
]);

const modified = (event: KeyboardEvent): boolean =>
  [
    event.altKey,
    event.ctrlKey,
    event.metaKey,
    event.shiftKey,
    event.isComposing,
  ].some(Boolean);

const stepOf = (event: KeyboardEvent): ImageStep | undefined =>
  modified(event) ? undefined : steps.get(event.key);

function listen(keydown: (event: KeyboardEvent) => void): () => void {
  document.addEventListener('keydown', keydown, true);

  return (): void => document.removeEventListener('keydown', keydown, true);
}

/*
 * Left and Right step between images while one is open. The kit's shortcuts ignore keys pressed
 * inside a dialog, so the open image listens itself, and keeps both keys from whatever lies under it.
 */
export function useImageStepKeys(
  open: boolean,
  onStep: (step: ImageStep) => void,
): void {
  const step = useEffectEvent((event: KeyboardEvent): void => {
    const by = stepOf(event);

    if (by === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    onStep(by);
  });

  useEffect(() => (open ? listen((event) => step(event)) : undefined), [open]);
}
