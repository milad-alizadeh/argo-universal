import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import type {
  ScrollFadeEdges,
  ScrollFadeFrameProps,
} from './scroll-fade-frame-view';
import { scrollFadeDepth } from './scroll-fade-overlay';
import { useScrollbarStrip } from './scroll-fade-scrollbar';

// The depths and insets the `scroll-fade-mask` class reads; registered as lengths in react-native-web.css, so a depth eases when an edge turns on or off.
type MaskDepths = React.CSSProperties &
  Record<
    | '--scroll-fade-top'
    | '--scroll-fade-bottom'
    | '--scroll-fade-top-inset'
    | '--scroll-fade-bottom-inset',
    string
  >;

type Edge = keyof ScrollFadeEdges;
type EdgeLengths = ScrollFadeFrameProps['depth'];

interface EdgeFade {
  edge: Edge;
  on: boolean;
  depth: number;
  inset: number;
}

const depthAt = (depth: EdgeLengths, edge: Edge): number =>
  depth?.[edge] ?? scrollFadeDepth[edge];

const insetAt = (inset: EdgeLengths, edge: Edge): number => inset?.[edge] ?? 0;

function edgeFade(props: ScrollFadeFrameProps, edge: Edge): EdgeFade {
  return {
    edge,
    on: props.edges[edge],
    depth: depthAt(props.depth, edge),
    inset: insetAt(props.inset, edge),
  };
}

const shownDepth = (fade: EdgeFade): number => (fade.on ? fade.depth : 0);

function maskDepths(top: EdgeFade, bottom: EdgeFade): MaskDepths {
  return {
    '--scroll-fade-top': `${shownDepth(top)}px`,
    '--scroll-fade-bottom': `${shownDepth(bottom)}px`,
    '--scroll-fade-top-inset': `${top.inset}px`,
    '--scroll-fade-bottom-inset': `${bottom.inset}px`,
  };
}

const frameViewProps = (props: ScrollFadeFrameProps): ViewProps => ({
  className: cn('relative', props.className),
  style: props.style,
  onLayout: props.onLayout,
});

// Around a scroll view: a mask fades its content itself to nothing at each fading edge, and hides it under an inset, but never its scrollbar, so whatever lies behind shows through unchanged.
export function ScrollFadeFrame(
  props: ScrollFadeFrameProps,
): React.JSX.Element {
  const top = edgeFade(props, 'top');
  const bottom = edgeFade(props, 'bottom');
  return (
    <View {...frameViewProps(props)}>
      <FadeMask mask={maskDepths(top, bottom)}>
        {props.children}
        <FadingBand fade={top} />
        <FadingBand fade={bottom} />
      </FadeMask>
    </View>
  );
}

function FadeMask(props: {
  mask: MaskDepths;
  children: ReactNode;
}): React.JSX.Element {
  const frame = useScrollbarStrip();
  return (
    <div
      ref={frame}
      className="scroll-fade-mask relative flex min-h-0 flex-auto flex-col"
      style={props.mask}
    >
      {props.children}
    </div>
  );
}

// Marks the band the mask fades, where native draws its overlay; it paints nothing.
function FadingBand({ fade }: { fade: EdgeFade }): React.JSX.Element | null {
  if (!fade.on) return null;
  return (
    <div
      aria-hidden
      data-testid={`scroll-fade-${fade.edge}`}
      className="pointer-events-none absolute inset-x-0"
      style={{ height: fade.depth, [fade.edge]: fade.inset }}
    />
  );
}
