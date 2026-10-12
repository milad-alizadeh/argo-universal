import { createContext, useContext } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useContentWide } from './content-layout';

// How far the Composer reaches up over the end of the Feed; the Feed's rows are hidden under it, so none shows through its glass.
export const composerOverlap = 48;

// The Feed fades out within the space it leaves above the Composer, so a row is gone before it meets the Composer: at the end only through the empty 24 under the last row, so that row stays whole; scrolled back, deeper.
export const composerFadeDepth = { atEnd: 24, away: 48 };

// The Feed's empty space between its last row and the Composer.
const feedEndGap = 24;

// How far the Composer covers the Feed's end: its overlap, or under iOS 26's glass Composer, the whole Composer area.
export const ComposerCover = createContext(composerOverlap);

// iOS 26 and later draw the phone Composer as Liquid Glass, and the Feed scrolls under it.
export function useGlassComposer(): boolean {
  const contentWide = useContentWide();
  return hasLiquidGlass && !contentWide;
}

export interface FeedEndClearance {
  // The space after the Feed's last row, so it rests above the Composer.
  endSpace: number;
  // How far above the Feed's bottom edge anything laid over its end, such as Jump to latest, sits: clear of the Composer and the deepest fade.
  overlayBottom: number;
}

export function useFeedEndClearance(): FeedEndClearance {
  const cover = useContext(ComposerCover);
  const fadeDepth = useGlassComposer() ? 0 : composerFadeDepth.away;
  return { endSpace: cover + feedEndGap, overlayBottom: cover + fadeDepth };
}
