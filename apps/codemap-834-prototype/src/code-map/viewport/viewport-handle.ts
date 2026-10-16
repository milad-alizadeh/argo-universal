import { useImperativeHandle, type RefObject } from 'react';
import type { Viewport } from './viewport';

/** Fills the Code Map's one camera handle with a mounted view's viewport; React clears it on unmount. */
export function useViewportHandle(
  handle: RefObject<Viewport | null>,
  viewport: Viewport,
): void {
  useImperativeHandle(handle, () => viewport, [viewport]);
}
