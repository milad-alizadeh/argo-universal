import { glassMaterial } from '@repo/kit/primitives/content/liquid-glass';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { type Ref, type RefObject, useRef } from 'react';
import {
  type ElementFrame,
  type SurfaceBounds,
  surfaceFrames,
  useFrameTransition,
} from '../../hooks/use-frame-transition.web';
import type { GlassSurfaceProps } from './glass-surface';

type PanelRef = RefObject<HTMLDivElement | null>;

interface GlassRefs {
  mask: PanelRef;
  edge: PanelRef;
  rail: PanelRef;
}

/*
 * The panel's box, from the frame's left edge and the column's top: the open panel, the rail alone below the title
 * bar, or the closed sidebar's capsule round its buttons, which the panel's glass grows from and shrinks into.
 * `height` is the panel's own only for the capsule; the panel otherwise runs to the column's bottom.
 */
interface GlassBox {
  left: number;
  top: number;
  width: number;
  height: number | null;
  opacity: number;
}

interface GlassLayerProps {
  ref: Ref<HTMLDivElement>;
  box: GlassBox;
}

interface GlassMaskProps extends GlassLayerProps {
  props: GlassSurfaceProps;
  railRef: Ref<HTMLDivElement>;
}

function glassBox(props: GlassSurfaceProps): GlassBox {
  const { width, barHeight, sidebarShown, origin, pill } = props;

  if (width === 0 && pill)
    return {
      left: pill.x,
      top: pill.y,
      width: pill.width,
      height: pill.height,
      opacity: 1,
    };

  return {
    left: origin,
    top: sidebarShown ? 0 : barHeight,
    width,
    height: null,
    opacity: width > 0 ? 1 : 0,
  };
}

// The box as the column draws it, from where the column starts now.
const boxStyle = (box: GlassBox, origin: number): React.CSSProperties => ({
  left: box.left - origin,
  top: box.top,
  width: box.width,
  ...(box.height === null ? { bottom: 0 } : { height: box.height }),
});

// The tint keeps the rail's place in the window while the panel's top moves past it.
const railTop = (props: GlassSurfaceProps, box: GlassBox): number =>
  props.barHeight - box.top;

function glassFrames(
  refs: GlassRefs,
  props: GlassSurfaceProps,
  [from, to]: readonly [GlassBox, GlassBox],
): readonly ElementFrame[] {
  const columnHeight = refs.mask.current?.parentElement?.offsetHeight ?? 0;

  const bounds = (box: GlassBox): SurfaceBounds => ({
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height ?? columnHeight - box.top,
    opacity: box.opacity,
  });

  const panel = surfaceFrames(bounds(from), bounds(to));

  const mask = panel.map(({ transform, transformOrigin }): Keyframe => ({
    transform,
    transformOrigin,
  }));

  const rail = [
    { transform: `translateY(${railTop(props, from) - railTop(props, to)}px)` },
    { transform: 'translateY(0px)' },
  ];

  return [
    [refs.mask.current, mask],
    [refs.edge.current, panel],
    [refs.rail.current, rail],
  ];
}

// The glass and rail tint have their own layers apart from the pane content.
function useGlassMotion(props: GlassSurfaceProps, box: GlassBox): GlassRefs {
  const mask = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const refs = { mask, edge, rail };
  useFrameTransition({
    ...props,
    value: box,
    frames: (from, to) => glassFrames(refs, props, [from, to]),
  });

  return refs;
}

// Dark only, Paper's Graphite: a hairline beside the list; none once the list hides, where the panel's own edge is.
function RailSeparator({
  shown,
}: {
  shown: boolean;
}): React.JSX.Element | null {
  if (!shown) return null;

  return (
    <div className="absolute bottom-4 right-0 top-0 hidden w-px bg-hairline dark:flex" />
  );
}

/*
 * Light, Paper's Rail B: the hover tint sets the rail apart from the list with no hairline, its top-right corner rounding
 * where the list begins. Dark has no tint, which would lift the rail above the list, only the separator.
 */
function RailTint({
  railRef,
  props,
  box,
}: Omit<GlassMaskProps, 'ref'>): React.JSX.Element {
  return (
    <div
      ref={railRef}
      className="absolute bottom-0 left-0 rounded-tr-2xl bg-hover dark:bg-transparent"
      style={{ width: props.railWidth, top: railTop(props, box) }}
    >
      <RailSeparator shown={props.sidebarShown} />
    </div>
  );
}

// A native sidebar can replace the fill while using the same panel geometry.
function GlassFill(): React.JSX.Element {
  return (
    <div
      data-sidebar-glass-fill
      className={cn(
        'absolute inset-0 bg-card',
        glassMaterial.fill,
        glassMaterial.frost,
      )}
    />
  );
}

function GlassMask({ ref, ...layer }: GlassMaskProps): React.JSX.Element {
  const panel = layer.box.height === null;

  return (
    <div
      ref={ref}
      data-sidebar-glass-panel=""
      className={cn(
        'pointer-events-none absolute bottom-0 left-0 overflow-hidden',
        panel ? 'rounded-2xl' : 'rounded-full',
      )}
      style={boxStyle(layer.box, layer.props.origin)}
    >
      <GlassFill />
      <RailTint {...layer} />
    </div>
  );
}

function GlassEdge({
  ref,
  box,
  origin,
}: GlassLayerProps & { origin: number }): React.JSX.Element {
  return (
    <div
      ref={ref}
      data-sidebar-glass-edge
      className={cn(
        'pointer-events-none absolute',
        glassMaterial.edge,
        box.height === null ? 'rounded-2xl' : 'rounded-full',
      )}
      style={boxStyle(box, origin)}
    />
  );
}

export function GlassSurface(props: GlassSurfaceProps): React.JSX.Element {
  const box = glassBox(props);
  const { mask, edge, rail } = useGlassMotion(props, box);

  return (
    <>
      <GlassMask ref={mask} railRef={rail} props={props} box={box} />
      <GlassEdge ref={edge} box={box} origin={props.origin} />
    </>
  );
}
