import type * as React from 'react';
import { type Ref, type RefObject, useRef } from 'react';
import {
  type ElementFrame,
  useShellTransition,
} from '../../hooks/use-shell-transition.web';
import type { GlassSurfaceProps } from './glass-surface';

type PanelRef = RefObject<HTMLDivElement | null>;

interface GlassRefs {
  mask: PanelRef;
  edge: PanelRef;
}

interface GlassLayerProps {
  ref: Ref<HTMLDivElement>;
  width: number;
}

interface GlassMaskProps extends GlassLayerProps {
  expandedWidth: number;
}

function resizeAll(
  panels: readonly (HTMLElement | null)[],
  from: number,
  to: number,
): readonly ElementFrame[] {
  const keyframes = [{ width: `${from}px` }, { width: `${to}px` }];
  return panels.map((panel): ElementFrame => [panel, keyframes]);
}

function useGlassMotion(props: GlassSurfaceProps): GlassRefs {
  const mask = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  useShellTransition({
    value: props.width,
    transitionKey: props.transitionKey,
    animate: props.animate,
    frames: (from, to) => resizeAll([mask.current, edge.current], from, to),
  });
  return { mask, edge };
}

function GlassMask({ ref, ...size }: GlassMaskProps): React.JSX.Element {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-0 left-0 top-0 overflow-hidden rounded-2xl"
      style={{ width: size.width }}
    >
      <div
        className="absolute bottom-0 left-0 top-0 bg-glass backdrop-blur-glass backdrop-saturate-180"
        style={{ width: Math.max(size.width, size.expandedWidth) }}
      />
    </div>
  );
}

function GlassEdge({ ref, width }: GlassLayerProps): React.JSX.Element {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-0 left-0 top-0 rounded-2xl shadow-glass"
      style={{ width }}
    />
  );
}

export function GlassSurface(props: GlassSurfaceProps): React.JSX.Element {
  const { mask, edge } = useGlassMotion(props);
  return (
    <>
      <GlassMask
        ref={mask}
        width={props.width}
        expandedWidth={props.expandedWidth}
      />
      <GlassEdge ref={edge} width={props.width} />
    </>
  );
}
