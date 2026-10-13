import type { ScrollView } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export type ScrollFadeEdgeName = 'top' | 'bottom';

// How an edge fades: as content scrolls past it, whatever the scroll position, or not at all.
export type ScrollFadeEdge = 'scrolled' | 'always' | 'never';

type PerEdge<T> = Partial<Record<ScrollFadeEdgeName, T>>;

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

// How deep content fades at each edge unless a caller says otherwise.
export const scrollFadeDepth = { top: 28, bottom: 36 } as const;

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
): number => depth?.[edge] ?? scrollFadeDepth[edge];

export const edgeInset = (
  edge: ScrollFadeEdgeName,
  inset: PerEdge<number> | undefined,
): number => inset?.[edge] ?? 0;
