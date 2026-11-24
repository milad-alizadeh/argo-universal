import { type ReactElement, useLayoutEffect, useRef } from 'react';
import { useFrameTransition } from '../hooks/use-frame-transition.web';
import type { WorkbenchClipProps } from './workbench-clip';

export type { WorkbenchClipProps } from './workbench-clip';

// Room round the Workbench for its glass's shadow, which the clip must not cut at the overlay's top and leading edges.
const shadowRoom = 48;

const pixels = (value: number): string => `${value}px`;

// The edge at rest, which the motion reads as the glass's own motion reads its resting box, so a capsule that settles in a new place moves the clip with it.
const restingEdge = '--workbench-clip-edge';

const widthFrom = (shift: number): string =>
  `calc(var(${restingEdge}) + ${pixels(shift + shadowRoom)})`;

/*
 * The Workbench slides out from under the Inspector and back, and never draws over its glass. The clip's trailing edge
 * follows the glass's leading edge on the panes' timing, and at rest the open Inspector's edge or none. It is an
 * overflow clip and nothing else: opacity, clip-path, mask and filter would make it a backdrop root, and the
 * Workbench's own glass would stop blurring the page behind it.
 */
export function WorkbenchClip({
  edge,
  inspectorOpen,
  children,
  ...motion
}: WorkbenchClipProps): ReactElement {
  const clip = useRef<HTMLDivElement>(null);

  // Before the motion's first frame reads it, and ahead of the paint of the render that moved it.
  useLayoutEffect(() => {
    clip.current?.style.setProperty(restingEdge, pixels(edge));
  }, [edge]);

  useFrameTransition({
    ...motion,
    value: { edge, inspectorOpen },
    // Only an Inspector opening or closing, or moving while open, has an edge to follow.
    frames: (from, to) =>
      from.inspectorOpen || to.inspectorOpen
        ? [
            [
              clip.current,
              [
                { width: widthFrom(from.edge - to.edge) },
                { width: widthFrom(0) },
              ],
            ],
          ]
        : [],
  });

  return (
    <div
      ref={clip}
      data-testid="workbench-clip"
      className="absolute bottom-0 overflow-hidden"
      style={{
        pointerEvents: 'none',
        top: -shadowRoom,
        left: -shadowRoom,
        width: inspectorOpen
          ? widthFrom(0)
          : `calc(100% + ${pixels(shadowRoom)})`,
      }}
    >
      <div
        className="absolute bottom-0"
        style={{ top: shadowRoom, left: shadowRoom }}
      >
        {children}
      </div>
    </div>
  );
}
