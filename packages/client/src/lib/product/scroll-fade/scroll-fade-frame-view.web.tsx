import type * as React from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import type { ScrollFadeFrameProps } from './scroll-fade-frame-view';
import {
  type ScrollFadeEdge,
  type ScrollFadeEdgeName,
  type ScrollFadeOptions,
  edgeDepth,
  edgeInset,
  edgeMode,
} from './scroll-fade-options';

type FadeLengths = React.CSSProperties &
  Record<
    `--scroll-fade-${ScrollFadeEdgeName}-${'depth' | 'rest' | 'inset'}`,
    string
  >;

const px = (length: number): string => `${length}px`;

const shownDepth = (mode: ScrollFadeEdge, depth: number): number =>
  mode === 'never' ? 0 : depth;

const restingDepth = (mode: ScrollFadeEdge, depth: number): number =>
  mode === 'always' ? depth : 0;

// One edge's lengths: its depth while content lies past it, its depth with none, and its inset.
function edgeLengths(
  edge: ScrollFadeEdgeName,
  { edges, depth, inset }: ScrollFadeOptions,
): { depth: string; rest: string; inset: string } {
  const mode = edgeMode(edge, edges);
  const fadeDepth = shownDepth(mode, edgeDepth(edge, depth));
  return {
    depth: px(fadeDepth),
    rest: px(restingDepth(mode, fadeDepth)),
    inset: px(edgeInset(edge, inset)),
  };
}

// The lengths the `scroll-fade` class in react-native-web.css reads.
function fadeLengths(options: ScrollFadeOptions): FadeLengths {
  const top = edgeLengths('top', options);
  const bottom = edgeLengths('bottom', options);
  return {
    '--scroll-fade-top-depth': top.depth,
    '--scroll-fade-top-rest': top.rest,
    '--scroll-fade-top-inset': top.inset,
    '--scroll-fade-bottom-depth': bottom.depth,
    '--scroll-fade-bottom-rest': bottom.rest,
    '--scroll-fade-bottom-inset': bottom.inset,
  };
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
      <div className="scroll-fade" style={fadeLengths(options)}>
        <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
      </div>
    </View>
  );
}
