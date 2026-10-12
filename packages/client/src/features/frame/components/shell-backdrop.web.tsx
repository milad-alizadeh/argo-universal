import type * as React from 'react';
import { type Ref, useRef } from 'react';
import { useShellTransition } from '../hooks/use-shell-transition.web';
import type { ShellBackdropProps } from './shell-backdrop';

// Paper's "SidebarBackdrop / Warm frost (contained)": three faint glows behind the glass, faded into the window surface at the right.
interface Glow {
  colour: string;
  left: number;
  top: number;
  size: number;
  stops: readonly { alpha: number; at: number }[];
}

interface Backdrop {
  width: number;
  glows: readonly Glow[];
}

const edgeFadeWidth = 56;

const backdrops = {
  expanded: {
    width: 400,
    glows: [
      {
        colour: 'warm',
        left: -410,
        top: -330,
        size: 900,
        stops: [
          { alpha: 16, at: 0 },
          { alpha: 6, at: 30 },
          { alpha: 0, at: 62 },
        ],
      },
      {
        colour: 'graphite',
        left: -260,
        top: 200,
        size: 640,
        stops: [
          { alpha: 6, at: 0 },
          { alpha: 0, at: 66 },
        ],
      },
      {
        colour: 'sand',
        left: -230,
        top: 510,
        size: 700,
        stops: [
          { alpha: 12, at: 0 },
          { alpha: 0, at: 64 },
        ],
      },
    ],
  },
  collapsed: {
    width: 144,
    glows: [
      {
        colour: 'warm',
        left: -410,
        top: -330,
        size: 900,
        stops: [
          { alpha: 10, at: 0 },
          { alpha: 4, at: 30 },
          { alpha: 0, at: 62 },
        ],
      },
      {
        colour: 'graphite',
        left: -260,
        top: 200,
        size: 640,
        stops: [
          { alpha: 4, at: 0 },
          { alpha: 0, at: 66 },
        ],
      },
      {
        colour: 'sand',
        left: -230,
        top: 510,
        size: 700,
        stops: [
          { alpha: 8, at: 0 },
          { alpha: 0, at: 64 },
        ],
      },
    ],
  },
} as const satisfies Record<string, Backdrop>;

function glowImage({ colour, stops }: Glow): string {
  const colours = stops.map(
    ({ alpha, at }) =>
      `color-mix(in oklab, var(--color-glow-${colour}) ${alpha}%, transparent) ${at}%`,
  );
  return `radial-gradient(circle farthest-corner at 50% 50% in oklab, ${colours.join(', ')})`;
}

function BackdropLayer({
  ref,
  backdrop,
  shown,
}: {
  ref: Ref<HTMLDivElement>;
  backdrop: Backdrop;
  shown: boolean;
}): React.JSX.Element {
  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 h-full overflow-hidden"
      style={{ width: backdrop.width, opacity: shown ? 1 : 0 }}
    >
      {backdrop.glows.map((glow) => (
        <div
          key={glow.colour}
          className="absolute"
          style={{
            left: glow.left,
            top: glow.top,
            width: glow.size,
            height: glow.size,
            backgroundImage: glowImage(glow),
          }}
        />
      ))}
      <div
        className="absolute top-0 h-full"
        style={{
          left: backdrop.width - edgeFadeWidth,
          width: edgeFadeWidth,
          backgroundImage:
            'linear-gradient(90deg in oklab, transparent, var(--color-sidebar))',
        }}
      />
    </div>
  );
}

// Each state's glow is static; switching states only cross-fades their opacity, which the compositor runs.
export function ShellBackdrop({
  sidebarShown,
  transitionKey,
  animate,
}: ShellBackdropProps): React.JSX.Element {
  const expanded = useRef<HTMLDivElement>(null);
  const collapsed = useRef<HTMLDivElement>(null);
  useShellTransition({
    value: sidebarShown,
    transitionKey,
    animate,
    frames: (from, to) => [
      [expanded.current, [{ opacity: Number(from) }, { opacity: Number(to) }]],
      [
        collapsed.current,
        [{ opacity: Number(!from) }, { opacity: Number(!to) }],
      ],
    ],
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 top-0"
    >
      <BackdropLayer
        ref={expanded}
        backdrop={backdrops.expanded}
        shown={sidebarShown}
      />
      <BackdropLayer
        ref={collapsed}
        backdrop={backdrops.collapsed}
        shown={!sidebarShown}
      />
    </div>
  );
}
