import type { ScrollView, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';

export type ScrollFadeEdgeName = 'top' | 'bottom';

// How an edge fades: as content scrolls past it, whatever the scroll position, or not at all.
export type ScrollFadeEdge = 'scrolled' | 'always' | 'never';

export type PerEdge<T> = Partial<Record<ScrollFadeEdgeName, T>>;

export interface ScrollFadeOptions {
  // Each edge fades as content scrolls past it unless said otherwise.
  edges?: PerEdge<ScrollFadeEdge>;
  // How deep each edge fades, where the default would not suit.
  depth?: PerEdge<number>;
  // How far something laid over the scroll view covers each edge: the fade ends where it begins, and the content under it is hidden.
  inset?: PerEdge<number>;
  // The surface colour a native overlay fades into; the web fades the content itself and needs none.
  surfaceClassName?: string;
}

// How deep content fades under the top edge unless a caller says otherwise.
const scrollFadeTopDepth = 28;

// The small gap a list leaves below its last row, on the spacing scale. The bottom fade is no deeper, so it overlays the content's edge: the last row rests whole just above the bottom.
export const scrollFadeEndGapClassName = 'pb-4';

// The web resolves a class to a CSS length such as "16px"; native resolves it to a number.
const points = (length: ViewStyle['paddingBottom']): number =>
  typeof length === 'string' ? Number.parseFloat(length) : Number(length ?? 0);

// The end gap in points.
export function useScrollFadeEndGap(): number {
  return points(useResolveClassNames(scrollFadeEndGapClassName).paddingBottom);
}

const depthOr = (
  depth: PerEdge<number> | undefined,
  edge: ScrollFadeEdgeName,
  fallback: number,
): number => depth?.[edge] ?? fallback;

// Each edge's depth: the caller's, or the top's default and the end gap at the bottom.
export function useFadeDepth(
  depth: PerEdge<number> | undefined,
): Required<PerEdge<number>> {
  return {
    top: depthOr(depth, 'top', scrollFadeTopDepth),
    bottom: depthOr(depth, 'bottom', useScrollFadeEndGap()),
  };
}

// How far content scrolls past an edge before its fade is whole; react-native-web.css keeps the same length for the web.
export const scrollFadeRamp = 24;

// The scroll view's measures native reads on the UI thread; the web's CSS reads its own.
export interface ScrollFadeMetrics {
  offset: SharedValue<number>;
  content: SharedValue<number>;
  viewport: SharedValue<number>;
}

// What a scroll view and its ScrollFadeFrame share. The web needs none of it.
export interface ScrollFadeTracking {
  // For the scroll view's ref, or a Legend List's `refScrollView`.
  attachScrollView?: (scrollView: ScrollView | null) => void;
  onContentSizeChange?: SizeChange;
  metrics?: ScrollFadeMetrics;
}

export type SizeChange = (width: number, height: number) => void;

export const edgeMode = (
  edge: ScrollFadeEdgeName,
  edges: PerEdge<ScrollFadeEdge> | undefined,
): ScrollFadeEdge => edges?.[edge] ?? 'scrolled';

export const edgeDepth = (
  edge: ScrollFadeEdgeName,
  depth: PerEdge<number> | undefined,
): number => depth?.[edge] ?? 0;

export const edgeInset = (
  edge: ScrollFadeEdgeName,
  inset: PerEdge<number> | undefined,
): number => inset?.[edge] ?? 0;
