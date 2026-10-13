import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '../generic/use-wide/use-wide';
import {
  composerFadeDepth,
  composerOverlap,
  useGlassComposer,
} from './composer-cover';
import type {
  PerEdge,
  ScrollFadeEdge,
  ScrollFadeOptions,
} from './scroll-fade/scroll-fade-options';
import { sessionSurface } from './session-column';

// How far the Feed fades out under the header: Paper's mask over the Feed column.
const headerFadeDepth = 56;

// iOS 26's glass header shades the Feed scrolled under it; every other header is solid, so the Feed fades out below it.
function feedFadeEdges(
  wide: boolean,
  glassComposer: boolean,
): PerEdge<ScrollFadeEdge> {
  return {
    top: wide || !hasLiquidGlass ? 'scrolled' : 'never',
    bottom: glassComposer ? 'never' : 'always',
  };
}

function feedFadeDepth(wide: boolean, atEnd: boolean): PerEdge<number> {
  return {
    top: wide ? headerFadeDepth : undefined,
    bottom: atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away,
  };
}

// The Feed fades out above the Composer, and wide under the header too; every fade lies in the space it can be seen in. At its end, whether the reader is there.
export function useFeedFade(atEnd: boolean): ScrollFadeOptions {
  const wide = useWide();
  return {
    edges: feedFadeEdges(wide, useGlassComposer()),
    depth: feedFadeDepth(wide, atEnd),
    inset: { bottom: composerOverlap },
    surfaceClassName: sessionSurface,
  };
}
