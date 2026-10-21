import type * as React from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#kit/scroll-column';
import { cn } from '#kit/utils';
import type { ScrollFadeFrameProps } from './scroll-fade-frame-view';
import {
  type ScrollFadeEdge,
  type ScrollFadeEdgeName,
  edgeInset,
  edgeMode,
  fadeEdgesFor,
} from './scroll-fade-options';

type FadeLengths = React.CSSProperties &
  Partial<
    Record<
      `--scroll-fade-${ScrollFadeEdgeName}-${'depth' | 'rest' | 'inset'}`,
      string
    >
  >;

const px = (length: number): string => `${length}px`;

const shownDepth = (mode: ScrollFadeEdge, depth: number): number =>
  mode === 'never' ? 0 : depth;

const restingDepth = (mode: ScrollFadeEdge, depth: number): number =>
  mode === 'always' ? depth : 0;

// One edge's lengths: its depth while content lies past it, its depth with none, and its inset.
interface EdgeLengths {
  depth: string;
  rest: string;
  inset: string;
}

type FadeOptions = Omit<ScrollFadeFrameProps, 'tracking' | 'children'>;

function edgeLengths(
  edge: ScrollFadeEdgeName,
  { edges, depth, inset }: FadeOptions,
): EdgeLengths {
  const mode = edgeMode(edge, edges);
  const fadeDepth = shownDepth(mode, depth[edge]);

  return {
    depth: px(fadeDepth),
    rest: px(restingDepth(mode, fadeDepth)),
    inset: px(edgeInset(edge, inset)),
  };
}

// One edge's lengths under the names the CSS reads.
function edgeVariables(
  edge: ScrollFadeEdgeName,
  options: FadeOptions,
): FadeLengths {
  const lengths = edgeLengths(edge, options);

  return {
    [`--scroll-fade-${edge}-depth`]: lengths.depth,
    [`--scroll-fade-${edge}-rest`]: lengths.rest,
    [`--scroll-fade-${edge}-inset`]: lengths.inset,
  };
}

// The lengths the `scroll-fade` class in react-native-web.css reads, for the two edges its axis fades.
function fadeLengths(options: FadeOptions): FadeLengths {
  const [start, end] = fadeEdgesFor(options.horizontal);

  return { ...edgeVariables(start, options), ...edgeVariables(end, options) };
}

// A horizontal scroll view takes `scroll-fade-inline`, which fades its leading and trailing edges instead.
function FadeLayer({
  children,
  ...options
}: FadeOptions & { children: React.ReactNode }): React.JSX.Element {
  const className = cn(
    'scroll-fade',
    options.horizontal && 'scroll-fade-inline',
  );

  return (
    <div className={className} style={fadeLengths(options)}>
      <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
    </div>
  );
}

// Around a scroll view: CSS fades its content itself at each edge as it scrolls, over whatever lies behind, with no JavaScript.
export function ScrollFadeFrame({
  className,
  style,
  children,
  ...options
}: ScrollFadeFrameProps): React.JSX.Element {
  return (
    <View className={cn('relative', className)} style={style}>
      <FadeLayer {...options}>{children}</FadeLayer>
    </View>
  );
}
