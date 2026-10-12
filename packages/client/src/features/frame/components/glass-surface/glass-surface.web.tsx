import type * as React from 'react';
import { useRef } from 'react';
import { useShellTransition } from '../../hooks/use-shell-transition.web';
import type { GlassSurfaceProps } from './glass-surface';

export function GlassSurface({
  width,
  expandedWidth,
  transitionKey,
  animate,
}: GlassSurfaceProps): React.JSX.Element {
  const mask = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const panelWidth = Math.max(width, expandedWidth);
  useShellTransition({
    value: width,
    transitionKey,
    animate,
    frames: (from, to) => {
      const keyframes = [{ width: `${from}px` }, { width: `${to}px` }];
      return [
        [mask.current, keyframes],
        [edge.current, keyframes],
      ];
    },
  });
  return (
    <>
      <div
        ref={mask}
        className="pointer-events-none absolute bottom-0 left-0 top-0 overflow-hidden rounded-2xl"
        style={{ width }}
      >
        <div
          className="absolute bottom-0 left-0 top-0 bg-glass backdrop-blur-glass backdrop-saturate-180"
          style={{ width: panelWidth }}
        />
      </div>
      <div
        ref={edge}
        className="pointer-events-none absolute bottom-0 left-0 top-0 rounded-2xl shadow-glass"
        style={{ width }}
      />
    </>
  );
}
