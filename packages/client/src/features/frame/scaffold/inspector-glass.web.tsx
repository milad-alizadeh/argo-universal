import { glassMaterialClass } from '@repo/kit/primitives/content/liquid-glass';
import { cn } from '@repo/kit/utils';
import { type CSSProperties, type ReactElement, useRef } from 'react';
import type { FramePaneProps } from '../components/frame-pane/frame-pane';
import { useFrameTransition } from '../hooks/use-frame-transition.web';
import type { InspectorBox, InspectorGlassProps } from './inspector-glass';

export type { InspectorBox } from './inspector-glass';

// The Inspector's pane draws no material of its own: this glass, which the closed Inspector's capsule shares, does.
export const inspectorSurface: FramePaneProps['surface'] = undefined;

const pixels = (value: number): string => `${value}px`;

const heightOf = (box: InspectorBox): string =>
  box.height === null
    ? `calc(100% - ${pixels(box.y + box.bottom)})`
    : pixels(box.height);

// The glass's box, as its style draws it at rest and as a keyframe while it moves.
const glassBox = (box: InspectorBox): CSSProperties & Keyframe => ({
  left: pixels(box.x),
  top: pixels(box.y),
  width: pixels(box.width),
  height: heightOf(box),
  borderRadius: pixels(box.radius),
  opacity: box.opacity,
});

// The content shows inside the glass alone, so it never draws outside the capsule as the panel grows from it.
const contentClip = (box: InspectorBox): CSSProperties & Keyframe => ({
  clipPath: `xywh(${pixels(box.x)} ${pixels(box.y)} ${pixels(box.width)} ${heightOf(box)} round ${pixels(box.radius)})`,
});

/*
 * The closed Inspector's capsule is the panel's own glass: as the Inspector opens, the capsule grows into the panel on
 * the panes' timing, its top becoming the panel's top row, and it shrinks back as the Inspector closes. The content
 * clips to the same box, so neither ever shows without the other.
 */
export function InspectorGlass({
  box,
  children,
  ...motion
}: InspectorGlassProps): ReactElement {
  const glass = useRef<HTMLDivElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  useFrameTransition({
    ...motion,
    value: box,
    frames: (from, to) => [
      [glass.current, [glassBox(from), glassBox(to)]],
      [clip.current, [contentClip(from), contentClip(to)]],
    ],
  });

  return (
    <>
      <div
        ref={glass}
        data-testid="inspector-glass"
        aria-hidden
        className={cn('pointer-events-none absolute', glassMaterialClass)}
        style={glassBox(box)}
      />
      <div
        ref={clip}
        className="pointer-events-none absolute inset-0"
        style={contentClip(box)}
      >
        {children}
      </div>
    </>
  );
}
