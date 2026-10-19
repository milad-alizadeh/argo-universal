import { type RefObject, useRef } from 'react';
import {
  type ElementFrame,
  useFrameTransition,
} from '../../hooks/use-frame-transition.web';
import type { FramePaneProps } from './frame-pane';

// Content sliding in from the left stays behind the pane's edge, under the sidebar it slides away from; to the right it may run past, off the window or under the Inspector.
export const leftEdgeClip = (left: number): string =>
  `inset(0 -100vw 0 ${left}px)`;

const clipFrames = (
  element: HTMLElement | null,
  shift: number,
): readonly ElementFrame[] => [
  [element, [{ clipPath: leftEdgeClip(shift) }, { clipPath: leftEdgeClip(0) }]],
];

/*
 * The pane takes its new place at once, so its clip starts where its edge was and follows the sidebar's edge there:
 * expanding, the content is not cut in the gutter the glass has yet to reach; collapsing, the page does not cover the
 * glass still shrinking.
 */
export function useEdgeClip(
  props: FramePaneProps,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useFrameTransition({
    value: props.offset,
    transitionKey: props.transitionKey,
    animate: props.animate ?? true,
    timing: props.timing,
    frames: (from, to) => clipFrames(ref.current, from - to),
  });

  return ref;
}
