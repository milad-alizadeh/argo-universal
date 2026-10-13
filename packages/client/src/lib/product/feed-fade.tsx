import type * as React from 'react';
import type { ReactNode } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '../generic/use-wide/use-wide';
import {
  composerFadeDepth,
  composerOverlap,
  useGlassComposer,
} from './composer-cover';
import {
  type ScrollFadeEdges,
  ScrollFadeFrame,
} from './scroll-fade/scroll-fade-frame';
import { sessionSurface } from './session-column';

// How far the Feed fades out under the header: Paper's mask over the Feed column.
const headerFadeDepth = 56;

interface FeedFadeProps {
  // Whether the reader is at the Feed's start, where nothing hides above, and at its end.
  atStart: boolean;
  atEnd: boolean;
  // The Feed's scroll view alone, so Jump to latest and the loading pill over it stay whole.
  children: ReactNode;
}

type FeedFadeDepth = Partial<Record<keyof ScrollFadeEdges, number>>;

// The Feed fades out above the Composer, and wide under the header too; every fade lies in the space it can be seen in.
export function FeedFade(props: FeedFadeProps): React.JSX.Element {
  return (
    <ScrollFadeFrame
      {...useFeedFade(props)}
      inset={{ bottom: composerOverlap }}
      surfaceClassName={sessionSurface}
      className="min-h-0 flex-1"
    >
      {props.children}
    </ScrollFadeFrame>
  );
}

function useFeedFade(props: FeedFadeProps): {
  edges: ScrollFadeEdges;
  depth: FeedFadeDepth;
} {
  const wide = useWide();
  const glassComposer = useGlassComposer();
  return {
    edges: feedFadeEdges({ wide, atStart: props.atStart, glassComposer }),
    depth: feedFadeDepth(wide, props.atEnd),
  };
}

// iOS 26's glass header shades the Feed scrolled under it; every other header is solid, so the Feed fades out below it.
function feedFadeEdges(feed: {
  wide: boolean;
  atStart: boolean;
  glassComposer: boolean;
}): ScrollFadeEdges {
  return {
    top: (feed.wide || !hasLiquidGlass) && !feed.atStart,
    bottom: !feed.glassComposer,
  };
}

function feedFadeDepth(wide: boolean, atEnd: boolean): FeedFadeDepth {
  return {
    top: wide ? headerFadeDepth : undefined,
    bottom: atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away,
  };
}
