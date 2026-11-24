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

// Whether the part eases its opacity as it moves, or holds it opaque until it rests.
type OpacityMotion = 'fade' | 'glass';

// Where a running motion has the element now: its translation and opacity, read before the motion is cancelled.
interface VisualPlace {
  shift: number;
  opacity: number;
}

function currentPlace(element: HTMLElement): VisualPlace {
  const style = getComputedStyle(element);

  const shift =
    style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m41;

  return { shift, opacity: Number(style.opacity) };
}

// A slide stays opaque while it shows or slides out, then its resting style hides it; a fade eases its opacity.
interface OffsetChange {
  next: OffsetMotion;
  last: OffsetMotion;
  opacity: OpacityMotion;
}

function keyframes(
  element: HTMLElement,
  { next, last, opacity }: OffsetChange,
): Keyframe[] {
  const now = currentPlace(element);
  const from = now.shift + last.offset - next.offset;
  const startTransform = `translateX(${from}px)`;
  const endTransform = 'translateX(0px)';

  // Visibility holds through the slide without making the ancestor a backdrop root.
  if (opacity === 'glass')
    return [
      { transform: startTransform, visibility: 'visible' },
      {
        transform: endTransform,
        visibility: next.visible ? 'visible' : 'hidden',
      },
    ];

  // At rest the element already holds its new opacity, so a fade starts from where it last showed.
  const moving = element
    .getAnimations()
    .some((animation) => animation.playState === 'running');

  const shown = moving ? now.opacity : Number(last.visible);

  return [
    { transform: startTransform, opacity: shown },
    { transform: endTransform, opacity: Number(next.visible) },
  ];
}

/*
 * The web plays the motion on the element, as the panes beside it do, rather than on Reanimated's JavaScript clock.
 * That clock starts inside the commit that changed the layout, so a heavy pane mounting in the same commit spent the
 * motion before its first frame and the part jumped to its place; an element's animation starts on the frame after
 * the commit and runs on the compositor, in step with the panes.
 */
function useOffsetMotion(
  props: OffsetMotion,
  opacity: OpacityMotion,
): FrameSlide {
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

    // A change that leaves the place alone carries on from wherever a running motion has the part.
    const frames = keyframes(node, { next: props, last, opacity });
    cancelMotion(motion.current);
    motion.current = mayAnimate(props.animate)
      ? playFrames([[node, frames]], props.timing)
      : [];
  }, [props, opacity]);

  const ref = useCallback((node: ViewElement | null): void => {
    element.current = node instanceof HTMLElement ? node : null;
  }, []);

  // The resting style: shown or gone; a running motion's keyframes draw over it.
  const style =
    opacity === 'glass'
      ? {
          visibility: props.visible
            ? ('visible' as const)
            : ('hidden' as const),
        }
      : { opacity: Number(props.visible) };

  return { ref, style };
}

// Take the destination layout immediately, then translate from the current visual position.
export function useFrameOffset(props: OffsetMotion): FrameSlide {
  return useOffsetMotion(props, 'fade');
}

// The Workbench slides without fading any ancestor of its glass.
export function useFrameSlide(props: OffsetMotion): FrameSlide {
  return useOffsetMotion(props, 'glass');
}
