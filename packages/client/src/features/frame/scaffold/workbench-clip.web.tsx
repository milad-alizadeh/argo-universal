import { type ReactElement, useLayoutEffect, useRef } from 'react';
import { useFrameTransition } from '../hooks/use-frame-transition.web';
import type { WorkbenchClipProps } from './workbench-clip';

export type { WorkbenchClipProps } from './workbench-clip';

// Room on every side of the Workbench for its glass's shadow, which reaches past its box, so the clip never cuts it at rest.
const shadowRoom = 48;

const pixels = (value: number): string => `${value}px`;

// The edge at rest, which the motion reads as the glass's own motion reads its resting box, so a capsule that settles in a new place moves the clip with it.
const restingEdgeVariable = '--workbench-clip-edge';

const widthFrom = (shift: number): string =>
  `calc(var(${restingEdgeVariable}) + ${pixels(shift + shadowRoom)})`;

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

  // Declared before the motion: the variable must hold this render's edge when the motion's keyframes first resolve it.
  useLayoutEffect(() => {
    clip.current?.style.setProperty(restingEdgeVariable, pixels(edge));
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
      className="absolute overflow-hidden"
      style={{
        pointerEvents: 'none',
        top: -shadowRoom,
        left: -shadowRoom,
        bottom: -shadowRoom,
        width: inspectorOpen
          ? widthFrom(0)
          : `calc(100% + ${pixels(shadowRoom * 2)})`,
      }}
    >
      <div
        className="absolute"
        style={{ top: shadowRoom, left: shadowRoom, bottom: shadowRoom }}
      >
        {children}
      </div>
    </div>
  );
}
