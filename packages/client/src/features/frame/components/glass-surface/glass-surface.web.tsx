import type * as React from 'react';
import { type Ref, type RefObject, useRef } from 'react';
import {
  type ElementFrame,
  useFrameTransition,
} from '../../hooks/use-frame-transition.web';
import type { GlassSurfaceProps } from './glass-surface';

type PanelRef = RefObject<HTMLDivElement | null>;

interface GlassRefs {
  mask: PanelRef;
  edge: PanelRef;
  rail: PanelRef;
}

// The panel's box inside the sidebar column: under the top bar with the list, or only the rail's below it.
interface GlassBox {
  width: number;
  top: number;
}

interface GlassLayerProps {
  ref: Ref<HTMLDivElement>;
  box: GlassBox;
}

interface GlassMaskProps extends GlassLayerProps {
  props: GlassSurfaceProps;
  railRef: Ref<HTMLDivElement>;
}

const glassBox = ({
  width,
  barHeight,
  sidebarShown,
}: Pick<
  GlassSurfaceProps,
  'width' | 'barHeight' | 'sidebarShown'
>): GlassBox => ({
  width,
  top: sidebarShown ? 0 : barHeight,
});

// The tint keeps the rail's place in the window while the panel's top moves past it.
const railTop = (props: GlassSurfaceProps, box: GlassBox): number =>
  props.barHeight - box.top;

const panelFrame = ({ width, top }: GlassBox): Keyframe => ({
  width: `${width}px`,
  top: `${top}px`,
});

function glassFrames(
  refs: GlassRefs,
  props: GlassSurfaceProps,
  [from, to]: readonly [GlassBox, GlassBox],
): readonly ElementFrame[] {
  const panel = [panelFrame(from), panelFrame(to)];
  const rail = [from, to].map((box) => ({ top: `${railTop(props, box)}px` }));

  return [
    [refs.mask.current, panel],
    [refs.edge.current, panel],
    [refs.rail.current, rail],
  ];
}

// The panel holds no content, so resizing it reflows nothing else.
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

// Paper's tinted rail: the hover tint sets it apart from the list with no hairline, its top-right corner rounding where the list begins.
function RailTint({
  railRef,
  props,
  box,
}: Omit<GlassMaskProps, 'ref'>): React.JSX.Element {
  return (
    <div
      ref={railRef}
      className="absolute bottom-0 left-0 rounded-tr-2xl bg-hover"
      style={{ width: props.railWidth, top: railTop(props, box) }}
    />
  );
}

function GlassFill({
  props,
  box,
}: Pick<GlassMaskProps, 'props' | 'box'>): React.JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 top-0 bg-glass backdrop-blur-glass backdrop-saturate-180"
      style={{ width: Math.max(box.width, props.expandedWidth) }}
    />
  );
}

function GlassMask({ ref, ...layer }: GlassMaskProps): React.JSX.Element {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-0 left-0 overflow-hidden rounded-2xl"
      style={layer.box}
    >
      <GlassFill {...layer} />
      <RailTint {...layer} />
    </div>
  );
}

function GlassEdge({ ref, box }: GlassLayerProps): React.JSX.Element {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-0 left-0 rounded-2xl shadow-glass"
      style={box}
    />
  );
}

export function GlassSurface(props: GlassSurfaceProps): React.JSX.Element {
  const box = glassBox(props);
  const { mask, edge, rail } = useGlassMotion(props, box);

  return (
    <>
      <GlassMask ref={mask} railRef={rail} props={props} box={box} />
      <GlassEdge ref={edge} box={box} />
    </>
  );
}
