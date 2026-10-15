import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '../generic/use-wide/use-wide';
import { composerFadeDepth, useFeedEndClearance } from './composer-cover';
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

function feedFadeDepth(wide: boolean, atEnd: boolean): PerEdge<number> {
  return {
    top: wide ? headerFadeDepth : undefined,
    bottom: atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away,
  };
}

// The Feed fades out above the Composer, ending where the Composer begins however far it covers the Feed (its overlap, or the measured glass Composer), and wide under the header too; every fade lies in the space it can be seen in, and nothing shows under the Composer. At its end, whether the reader is there.
export function useFeedFade(atEnd: boolean): ScrollFadeOptions {
  const wide = useWide();
  const { composerTop } = useFeedEndClearance();

  return {
    edges: feedFadeEdges(wide),
    depth: feedFadeDepth(wide, atEnd),
    inset: { bottom: composerTop },
    surfaceClassName: sessionSurface,
  };
}
