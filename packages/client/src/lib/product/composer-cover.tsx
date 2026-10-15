import { createContext, useContext, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { liquidGlassAvailable } from '#primitives/display/liquid-glass';
import { useContentWide } from './content-layout';

// How far the Composer reaches up over the end of the Feed; the Feed's rows are hidden under it, so none shows through its glass.
export const composerOverlap = 48;

// The Feed fades out within the space it leaves above the Composer, so a row is gone before it meets the Composer: at the end only through the empty 24 under the last row, so that row stays whole; scrolled back, deeper.
export const composerFadeDepth = { atEnd: 24, away: 48 };

// The Feed's empty space between its last row and the Composer.
const feedEndGap = 24;

// How far the Composer covers the Feed's end: its overlap, or under iOS 26's glass Composer, the whole Composer area.
export const ComposerCover = createContext(composerOverlap);

// Where the system draws Liquid Glass, the phone Composer is glass, laid over the Feed's end; the Feed fades out above it.
export function useGlassComposer(): boolean {
  const contentWide = useContentWide();

  return liquidGlassAvailable && !contentWide;
}

export interface FeedEndClearance {
  // The space after the Feed's last row, so it rests above the Composer.
  endSpace: number;
  // How far above the Feed's bottom edge the Composer's top lies, with its pills and trays, so anything laid over the Feed's end, such as Jump to latest, keeps one gap above it.
  composerTop: number;
}

export function useFeedEndClearance(): FeedEndClearance {
  const cover = useContext(ComposerCover);

  return { endSpace: cover + feedEndGap, composerTop: cover };
}

export interface GlassCover {
  cover: number;
  onComposerLayout: (event: LayoutChangeEvent) => void;
}

// How far the glass Composer covers the Feed's end: the Composer, and below it the home indicator's space, which the open keyboard takes over.
export function useGlassCover(bottom: number): GlassCover {
  const [composerHeight, setComposerHeight] = useState<number>();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const below = keyboardOpen ? 0 : bottom;

  return {
    cover:
      composerHeight === undefined ? composerOverlap : composerHeight + below,
    onComposerLayout: (event) =>
      setComposerHeight(event.nativeEvent.layout.height),
  };
}
