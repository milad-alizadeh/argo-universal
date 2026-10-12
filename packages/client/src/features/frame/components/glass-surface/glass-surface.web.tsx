import type * as React from 'react';
import { useRef } from 'react';
import { useShellTransition } from '../../hooks/use-shell-transition.web';
import type { GlassSurfaceProps } from './glass-surface';

const clip = (panelWidth: number, width: number): string =>
  `inset(0 ${Math.max(0, panelWidth - width)}px 0 0 round var(--radius-2xl))`;

// The blur keeps one size and only its clip moves, so the backdrop filter never works on a resized region; an unfiltered edge layer carries the shadow.
export function GlassSurface({
  width,
  expandedWidth,
  transitionKey,
  animate,
}: GlassSurfaceProps): React.JSX.Element {
  const blur = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const panelWidth = Math.max(width, expandedWidth);
  useShellTransition({
    value: width,
    transitionKey,
    animate,
    frames: (from, to) => [
      [
        blur.current,
        [
          { clipPath: clip(panelWidth, from) },
          { clipPath: clip(panelWidth, to) },
        ],
      ],
      [edge.current, [{ width: `${from}px` }, { width: `${to}px` }]],
    ],
  });
  return (
    <>
      <div
        ref={blur}
        className="pointer-events-none absolute bottom-0 left-0 top-0 bg-glass backdrop-blur-glass backdrop-saturate-180"
        style={{ width: panelWidth, clipPath: clip(panelWidth, width) }}
      />
      <div
        ref={edge}
        className="pointer-events-none absolute bottom-0 left-0 top-0 rounded-2xl shadow-glass"
        style={{ width }}
      />
    </>
  );
}
