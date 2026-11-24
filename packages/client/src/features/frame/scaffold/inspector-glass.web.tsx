import { glassMaterialClass } from '@repo/kit/primitives/content/liquid-glass';
import { cn } from '@repo/kit/utils';
import { type CSSProperties, type ReactElement, useRef } from 'react';
import type { FramePaneProps } from '../components/frame-pane/frame-pane';
import {
  surfaceFrames,
  type SurfaceBounds,
  useFrameTransition,
} from '../hooks/use-frame-transition.web';
import type { InspectorBox, InspectorGlassProps } from './inspector-glass';

export type { InspectorBox } from './inspector-glass';

// The Inspector's pane draws no material of its own: this glass, which the closed Inspector's capsule shares, does.
export const inspectorSurface: FramePaneProps['surface'] = undefined;

const pixels = (value: number): string => `${value}px`;

const heightOf = (box: InspectorBox): string =>
  box.height === null
    ? `calc(100% - ${pixels(box.y + box.bottom)})`
    : pixels(box.height);

// The glass's layout box at rest.
const glassBox = (box: InspectorBox): CSSProperties => ({
  left: pixels(box.x),
  top: pixels(box.y),
  width: pixels(box.width),
  height: heightOf(box),
  opacity: box.opacity,
});

// The content shows inside the glass alone, so it never draws outside the capsule as the panel grows from it.
const contentClip = (box: InspectorBox): CSSProperties => ({
  clipPath: `xywh(${pixels(box.x)} ${pixels(box.y)} ${pixels(box.width)} ${heightOf(box)} round ${box.height === null ? 'var(--radius-2xl)' : '9999px'})`,
});

// The same clip in pixels throughout, so it eases from the capsule's box to the panel's with the glass.
const clipFrame = (box: InspectorBox, height: number): Keyframe => ({
  clipPath: `xywh(${pixels(box.x)} ${pixels(box.y)} ${pixels(box.width)} ${pixels(height)} round ${box.height === null ? 'var(--radius-2xl)' : pixels(height / 2)})`,
});

/*
 * The closed Inspector's capsule is the panel's own glass: as the Inspector opens, the capsule grows into the panel on
 * the panes' timing. The content's clip grows with it, from the capsule's box, so no content draws without its glass.
 */
export function InspectorGlass({
  box,
  children,
  ...motion
}: InspectorGlassProps): ReactElement {
  const glass = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useFrameTransition({
    ...motion,
    value: box,
    frames: (from, to) => {
      const parentHeight = glass.current?.parentElement?.clientHeight ?? 0;

      const bounds = (value: InspectorBox): SurfaceBounds => ({
        ...value,
        height: value.height ?? parentHeight - value.y - value.bottom,
      });

      const [start, end] = [bounds(from), bounds(to)];

      return [
        [glass.current, surfaceFrames(start, end)],
        [
          content.current,
          [clipFrame(from, start.height), clipFrame(to, end.height)],
        ],
      ];
    },
  });

  return (
    <>
      <div
        ref={glass}
        data-testid="inspector-glass"
        aria-hidden
        className={cn(
          'pointer-events-none absolute',
          glassMaterialClass,
          box.height === null ? 'rounded-2xl' : 'rounded-full',
        )}
        style={glassBox(box)}
      />
      <div
        ref={content}
        className="pointer-events-none absolute inset-0"
        style={contentClip(box)}
      >
        {children}
      </div>
    </>
  );
}
