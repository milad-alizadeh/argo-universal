import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFade } from './scroll-fade-overlay';

export interface ScrollFadeEdges {
  top: boolean;
  bottom: boolean;
}

export interface ScrollFadeFrameProps {
  // The edges whose content fades out now.
  edges: ScrollFadeEdges;
  // How deep each edge fades, where the default would not suit.
  depth?: Partial<Record<keyof ScrollFadeEdges, number>>;
  // How far something laid over the list covers each edge: the fade ends where it begins, and the content under it is hidden.
  inset?: Partial<Record<keyof ScrollFadeEdges, number>>;
  // The surface colour a native overlay fades into; the web fades the content itself and needs none.
  surfaceClassName?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  // The scroll view whose content fades.
  children: ReactNode;
}

// Around a scroll view: native draws a gradient in the surface colour over each fading edge.
export function ScrollFadeFrame({
  edges,
  depth,
  inset,
  surfaceClassName,
  className,
  style,
  onLayout,
  children,
}: ScrollFadeFrameProps): React.JSX.Element {
  return (
    <View
      className={cn('relative', className)}
      style={style}
      onLayout={onLayout}
    >
      {children}
      {edges.top && (
        <ScrollFade
          edge="top"
          className={surfaceClassName}
          height={depth?.top}
          inset={inset?.top}
        />
      )}
      {edges.bottom && (
        <ScrollFade
          edge="bottom"
          className={surfaceClassName}
          height={depth?.bottom}
          inset={inset?.bottom}
        />
      )}
    </View>
  );
}
