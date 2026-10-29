import { hasLiquidGlass } from '@repo/kit/native-header';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { useComposerFade } from './composer-cover';
import {
  fadeDepth,
  type PerEdge,
  type ScrollFadeEdge,
  type ScrollFadeOptions,
} from './scroll-fade/scroll-fade-options';
import { sessionSurface } from './session-column';

// How far the Feed fades out under the header: Paper's mask over the Feed column.
const headerFadeDepth = 56;

// iOS 26's glass header shades the Feed scrolled under it; every other header is solid, so the Feed fades out below it.
const topFade = (wide: boolean): ScrollFadeEdge =>
  wide || !hasLiquidGlass ? 'scrolled' : 'never';

// The Feed always fades out above the Composer, glass or not: text under the Composer would be hard to read.
const feedFadeEdges = (wide: boolean): PerEdge<ScrollFadeEdge> => ({
  top: topFade(wide),
  bottom: 'always',
});

// How far below the top of the view a row rests clear of the top fade.
export function useFeedTopClearance(): number {
  return useWide() ? headerFadeDepth : fadeDepth().top;
}

// The Feed fades out where the Composer's card begins, so nothing shows under it, and wide under the header. Where the Composer is not glass, its depth follows whether the reader is at the Feed's end.
export function useFeedFade(atEnd: boolean): ScrollFadeOptions {
  const wide = useWide();
  const { inset, depth } = useComposerFade(atEnd);

  return {
    edges: feedFadeEdges(wide),
    depth: { top: wide ? headerFadeDepth : undefined, bottom: depth },
    inset: { bottom: inset },
    surfaceClassName: sessionSurface,
  };
}
