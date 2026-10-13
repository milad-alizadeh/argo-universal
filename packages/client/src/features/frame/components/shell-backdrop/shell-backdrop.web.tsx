import type * as React from 'react';
import { type Ref, type RefObject, useRef } from 'react';
import {
  type ElementFrame,
  useShellTransition,
} from '../../hooks/use-shell-transition.web';
import { type Glow, type SidebarGlows, sidebarGlows } from '../sidebar-glows';
import type { ShellBackdropProps } from './shell-backdrop';

interface Backdrop extends SidebarGlows {
  width: number;
}

type LayerRef = RefObject<HTMLDivElement | null>;

const backdrops = {
  expanded: { width: 400, ...sidebarGlows('desktop', 'full') },
  collapsed: { width: 144, ...sidebarGlows('desktop', 'faint') },
} satisfies Record<string, Backdrop>;

interface LayerProps {
  ref: Ref<HTMLDivElement>;
  state: keyof typeof backdrops;
  shown: boolean;
}

function glowImage({ colour, stops }: Glow): string {
  const colours = stops.map(
    ({ alpha, at }) =>
      `color-mix(in oklab, var(--color-glow-${colour}) ${alpha}%, transparent) ${at}%`,
  );
  return `radial-gradient(circle farthest-corner at 50% 50% in oklab, ${colours.join(', ')})`;
}

function GlowSpot({ glow }: { glow: Glow }): React.JSX.Element {
  return (
    <div
      className="absolute"
      style={{
        left: glow.left,
        top: glow.top,
        width: glow.size,
        height: glow.size,
        backgroundImage: glowImage(glow),
      }}
    />
  );
}

function EdgeFade({ backdrop }: { backdrop: Backdrop }): React.JSX.Element {
  return (
    <div
      className="absolute top-0 h-full"
      style={{
        left: backdrop.width - backdrop.edgeFadeWidth,
        width: backdrop.edgeFadeWidth,
        backgroundImage:
          'linear-gradient(90deg in oklab, transparent, var(--color-sidebar))',
      }}
    />
  );
}

function BackdropLayer({ ref, ...layer }: LayerProps): React.JSX.Element {
  const backdrop = backdrops[layer.state];
  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 h-full overflow-hidden"
      style={{ width: backdrop.width, opacity: layer.shown ? 1 : 0 }}
    >
      {backdrop.glows.map((glow) => (
        <GlowSpot key={glow.colour} glow={glow} />
      ))}
      <EdgeFade backdrop={backdrop} />
    </div>
  );
}

function crossFade(
  [expanded, collapsed]: readonly [HTMLElement | null, HTMLElement | null],
  from: boolean,
  to: boolean,
): readonly ElementFrame[] {
  return [
    [expanded, [{ opacity: Number(from) }, { opacity: Number(to) }]],
    [collapsed, [{ opacity: Number(!from) }, { opacity: Number(!to) }]],
  ];
}

function useBackdropMotion({ sidebarShown, ...timing }: ShellBackdropProps): {
  expanded: LayerRef;
  collapsed: LayerRef;
} {
  const expanded = useRef<HTMLDivElement>(null);
  const collapsed = useRef<HTMLDivElement>(null);
  useShellTransition({
    ...timing,
    value: sidebarShown,
    frames: (from, to) =>
      crossFade([expanded.current, collapsed.current], from, to),
  });
  return { expanded, collapsed };
}

// Each state's glow is static; switching states only cross-fades their opacity, which the compositor runs.
export function ShellBackdrop(props: ShellBackdropProps): React.JSX.Element {
  const { expanded, collapsed } = useBackdropMotion(props);
  const shown = props.sidebarShown;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 top-0"
    >
      <BackdropLayer ref={expanded} state="expanded" shown={shown} />
      <BackdropLayer ref={collapsed} state="collapsed" shown={!shown} />
    </div>
  );
}
