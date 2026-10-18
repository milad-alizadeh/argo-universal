import { createContext, useCallback, useContext, useState } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { type SpacingToken, useSpacing } from '#lib/generic/use-spacing';
import { liquidGlassAvailable } from '#primitives/content/liquid-glass';
import { useContentWide } from './content-layout';

// How far the Composer reaches up over the end of the Feed; the Feed's rows are hidden under it, so none shows through its glass.
export const composerOverlap = 48;

// The Feed fades out in the space above the Composer: at its end only within the gap under the last row, so that row stays whole; scrolled back, deeper.
const composerFadeDepth = {
  atEnd: '--spacing-6',
  away: '--spacing-12',
} as const satisfies Record<string, SpacingToken>;

// The Feed's gap between its last row and the Composer.
const feedEndGap = '--spacing-6';

// How far the Composer covers the Feed's end: its overlap, or under iOS 26's glass Composer, the whole Composer area.
export const ComposerCover = createContext(composerOverlap);

// Where the system draws Liquid Glass, the phone Composer is glass, laid over the Feed's end.
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

  return { endSpace: cover + useSpacing(feedEndGap), composerTop: cover };
}

// How deep the Feed fades out above the Composer.
export function useComposerFadeDepth(atEnd: boolean): number {
  return useSpacing(atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away);
}

export interface GlassCover {
  cover: number;
  measureComposer: (view: View | null) => void;
  onComposerLayout: (event: LayoutChangeEvent) => void;
}

// The Composer's height, measured as it mounts and again on each layout.
function useComposerHeight(): Omit<GlassCover, 'cover'> & {
  height: number | undefined;
} {
  const [height, setHeight] = useState<number>();

  // Fabric measures synchronously while the ref attaches, before the first paint, so the Feed's end never draws against a guess.
  const measureComposer = useCallback((view: View | null) => {
    view?.measure((...box: number[]) => setHeight(box[3]));
  }, []);

  return {
    height,
    measureComposer,
    onComposerLayout: (event) => setHeight(event.nativeEvent.layout.height),
  };
}

// How far the glass Composer covers the Feed's end: the Composer, and below it the home indicator's space, which the open keyboard takes over.
export function useGlassCover(bottom: number): GlassCover {
  const { height, ...composer } = useComposerHeight();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const below = keyboardOpen ? 0 : bottom;

  return {
    cover: height === undefined ? composerOverlap : height + below,
    ...composer,
  };
}
