import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '../generic/use-wide/use-wide';
import { useComposerFadeDepth, useFeedEndClearance } from './composer-cover';
import type {
  PerEdge,
  ScrollFadeEdge,
  ScrollFadeOptions,
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

// The Feed fades out where the Composer begins, so nothing shows under it, and wide under the header. At its end, whether the reader is there.
export function useFeedFade(atEnd: boolean): ScrollFadeOptions {
  const wide = useWide();
  const { composerTop } = useFeedEndClearance();
  const bottom = useComposerFadeDepth(atEnd);

  return {
    edges: feedFadeEdges(wide),
    depth: { top: wide ? headerFadeDepth : undefined, bottom },
    inset: { bottom: composerTop },
    surfaceClassName: sessionSurface,
  };
}
