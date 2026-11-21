import { useCallback, useLayoutEffect, useRef } from 'react';
import type {
  FrameSlide,
  OffsetMotion,
  ViewElement,
} from './frame-slide-types';
import {
  cancelMotion,
  mayAnimate,
  playFrames,
  useCancelOnUnmount,
} from './use-frame-transition.web';

type Fade = 'fade' | 'slide';

// Where a running motion has the element now: its translation and opacity, read before the motion is cancelled.
interface Place {
  shift: number;
  opacity: number;
}

function currentPlace(element: HTMLElement): Place {
  const style = getComputedStyle(element);

  const shift =
    style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m41;

  return { shift, opacity: Number(style.opacity) };
}

// A slide stays opaque while it shows or slides out, then its resting style hides it; a fade eases its opacity.
interface Change {
  next: OffsetMotion;
  last: OffsetMotion;
  fade: Fade;
}

function keyframes(
  element: HTMLElement,
  { next, last, fade }: Change,
): Keyframe[] {
  const now = currentPlace(element);
  const from = now.shift + last.offset - next.offset;

  const opacity =
    fade === 'fade' ? [now.opacity, Number(next.visible)] : [1, 1];

  return [
    { transform: `translateX(${from}px)`, opacity: opacity[0] },
    { transform: 'translateX(0px)', opacity: opacity[1] },
  ];
}

function moves(next: OffsetMotion, last: OffsetMotion): boolean {
  return next.offset !== last.offset || next.visible !== last.visible;
}

/*
 * The web plays the motion on the element, as the panes beside it do, rather than on Reanimated's JavaScript clock.
 * That clock starts inside the commit that changed the layout, so a heavy pane mounting in the same commit spent the
 * motion before its first frame and the part jumped to its place; an element's animation starts on the frame after
 * the commit and runs on the compositor, in step with the panes.
 */
function useOffsetMotion(props: OffsetMotion, fade: Fade): FrameSlide {
  const element = useRef<HTMLElement | null>(null);
  const motion = useRef<Animation[]>([]);
  const previous = useRef(props);
  useCancelOnUnmount(motion);
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = props;
    const node = element.current;

    if (!node) return;

    // A resize moves immediately; an unrelated render leaves an ongoing motion alone.
    if (props.transitionKey === last.transitionKey) {
      if (props.offset !== last.offset) cancelMotion(motion.current);

      return;
    }

    const frames = keyframes(node, { next: props, last, fade });
    cancelMotion(motion.current);
    motion.current =
      mayAnimate(props.animate) && moves(props, last)
        ? playFrames([[node, frames]], props.timing)
        : [];
  }, [props, fade]);

  const ref = useCallback((node: ViewElement | null): void => {
    element.current = node instanceof HTMLElement ? node : null;
  }, []);

  // The resting style: shown or gone; a running motion's keyframes draw over it.
  return { ref, style: { opacity: Number(props.visible) } };
}

// Take the destination layout immediately, then translate from the current visual position.
export function useFrameOffset(props: OffsetMotion): FrameSlide {
  return useOffsetMotion(props, 'fade');
}

// The same motion with no fade: the container is fully opaque while it shows or slides out, and transparent once it has gone.
export function useFrameSlide(props: OffsetMotion): FrameSlide {
  return useOffsetMotion(props, 'slide');
}
