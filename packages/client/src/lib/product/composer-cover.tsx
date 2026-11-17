import { liquidGlassAvailable } from '@repo/kit/primitives/content/liquid-glass';
import { scrollFadeLayer } from '@repo/kit/scroll-fade/scroll-fade-options';
import { type SpacingToken, useSpacing } from '@repo/kit/use-spacing';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { LayoutChangeEvent, ViewInstance } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentWide } from './content-layout';

// How far the Composer reaches up over the end of the Feed; the Feed's rows are hidden under it, so none shows through its glass.
export const composerOverlap = 48;

// Where the Composer's overlap is all the Feed has to fade into, it fades out in the space above the Composer: at its end only within the gap under the last row, so that row stays whole; scrolled back, deeper.
const composerFadeDepth = {
  atEnd: '--spacing-6',
  away: '--spacing-12',
} as const satisfies Record<string, SpacingToken>;

// The Feed's gap between its last row and the Composer.
const feedEndGap = '--spacing-6';

// How far a pill, and Jump to latest above the Composer, sit above what is under them, on every device.
export const overlayGap = 12;

// Above the Feed's edge fades. On native a frame without a style of its own is flattened away, and its fades then compete with an overlay on one level.
export const overlayLayer = scrollFadeLayer + 1;

// How far a pill lifts what floats above the Composer, such as Jump to latest: nothing while no pill is drawn.
export const ComposerPillLift = createContext(0);

// How far the Composer covers the Feed's end: its overlap, or under iOS 26's glass Composer, the whole Composer area.
export const ComposerCover = createContext(composerOverlap);

// Where the system draws Liquid Glass, the phone Composer is glass, laid over the Feed's end.
export function useGlassComposer(): boolean {
  const contentWide = useContentWide();

  return liquidGlassAvailable && !contentWide;
}

export interface FeedEndClearance {
  // The space after the Feed's last row, so it rests above the Composer and the pill over it.
  endSpace: number;
  // How far above the Feed's bottom edge the Composer's top lies, with its pills and trays, which the Feed's fade ends at.
  composerTop: number;
  // The `bottom` of Jump to latest: one gap above the Composer's top and above the pill, when there is one.
  floatingBottom: number;
  // The `bottom` of a pill: one gap above the Composer's top, whatever lifts.
  pillBottom: number;
}

export function useFeedEndClearance(): FeedEndClearance {
  const cover = useContext(ComposerCover);
  const lift = useContext(ComposerPillLift);

  return {
    endSpace: cover + useSpacing(feedEndGap) + lift,
    composerTop: cover,
    floatingBottom: cover + lift + overlayGap,
    pillBottom: cover + overlayGap,
  };
}

// How deep the Feed fades out above the Composer.
function useComposerFadeDepth(atEnd: boolean): number {
  return useSpacing(atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away);
}

// How tall the glass Composer's pill row is, with the gap under it: undefined where no glass Composer measures it.
const ComposerPills = createContext<number | undefined>(undefined);

const ReportComposerPills = createContext<(height: number) => void>(() => {});

// What the glass Composer lays over the Feed's end: how far it covers it, and the pill row's height, which the Feed fades out behind instead of above.
export function GlassCoverProvider(props: {
  cover: number;
  children: ReactNode;
}): React.JSX.Element {
  const [pills, setPills] = useState(0);

  return (
    <ComposerCover.Provider value={props.cover}>
      <ReportComposerPills.Provider value={setPills}>
        <ComposerPills.Provider value={pills}>
          {props.children}
        </ComposerPills.Provider>
      </ReportComposerPills.Provider>
    </ComposerCover.Provider>
  );
}

// For the pill row's layout, which the Feed's fade reads; the row reports none once it is gone.
export function useReportComposerPills(): (event: LayoutChangeEvent) => void {
  const report = useContext(ReportComposerPills);
  useEffect(() => (): void => report(0), [report]);

  return useCallback(
    (event: LayoutChangeEvent) => report(event.nativeEvent.layout.height),
    [report],
  );
}

export interface ComposerFade {
  // How far above the Feed's bottom edge the fade ends.
  inset: number;
  depth: number;
}

// Where the Feed fades out above the Composer. Over a glass Composer it starts at the pills' top and ends at the card's top, so nothing above the pills fades; with no pills, only a short fade above the card, at the Feed's end and away from it alike.
export function useComposerFade(atEnd: boolean): ComposerFade {
  const composerTop = useContext(ComposerCover);
  const pills = useContext(ComposerPills);
  const depth = useComposerFadeDepth(atEnd);
  const shortDepth = useComposerFadeDepth(true);

  if (pills === undefined) return { inset: composerTop, depth };

  return { inset: composerTop - pills, depth: pills || shortDepth };
}

/*
 * Where iOS 26 draws its own glass bars, such as the Sessions list's search bar: they end this far below the
 * bottom safe area's top, which on an iPhone 17 Pro puts them 28pt above the screen's bottom edge (measured).
 */
const glassBarDrop = 6;

// The space the glass Composer keeps under it, as the stock glass bars do.
export function useGlassBarSpace(): number {
  return Math.max(useSafeAreaInsets().bottom - glassBarDrop, 0);
}

export interface GlassCover {
  cover: number;
  measureComposer: (view: ViewInstance | null) => void;
  onComposerLayout: (event: LayoutChangeEvent) => void;
}

// The Composer's height, measured as it mounts and again on each layout.
function useComposerHeight(): Omit<GlassCover, 'cover'> & {
  height: number | undefined;
} {
  const [height, setHeight] = useState<number>();

  // Fabric measures synchronously while the ref attaches, before the first paint, so the Feed's end never draws against a guess.
  const measureComposer = useCallback((view: ViewInstance | null) => {
    view?.measure((...box: number[]) => setHeight(box[3]));
  }, []);

  return {
    height,
    measureComposer,
    onComposerLayout: (event) => setHeight(event.nativeEvent.layout.height),
  };
}

// How far the glass Composer covers the Feed's end: the Composer, and below it the `bottom` space it keeps clear of the screen's edge, which the open keyboard takes over.
export function useGlassCover(bottom: number): GlassCover {
  const { height, ...composer } = useComposerHeight();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const below = keyboardOpen ? 0 : bottom;

  return {
    cover: height === undefined ? composerOverlap : height + below,
    ...composer,
  };
}
