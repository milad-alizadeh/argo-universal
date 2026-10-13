import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { cn } from '#lib/generic/utils';
import { BottomSheetAnchor } from '#primitives/overlays/bottom-sheet/bottom-sheet-anchor';
import { useWide } from '../generic/use-wide/use-wide';
import {
  ComposerCover,
  composerFadeDepth,
  composerOverlap,
  useGlassComposer,
  useGlassCover,
} from './composer-cover';
import { KeyboardAvoidingContent, Screen } from './screen/screen';
import type { ScrollFadeOptions } from './scroll-fade/scroll-fade-options';

// The one surface a Session sits on, the same on a phone and in a window. The screen and the Feed's native fades take it from here.
const sessionSurface = 'bg-sidebar';

// How far the Feed fades out under the header: Paper's mask over the Feed column.
const headerFadeDepth = 56;

// The Session's one column: as wide as the Composer at most, centred in the pane with the pane's side padding. CSS centres it on every width change, so nothing in it depends on a width measured earlier.
export function SessionColumn({
  className,
  children,
  ...props
}: ViewProps): React.JSX.Element {
  return (
    <View className="w-full px-4 wide:px-6">
      <View
        {...props}
        className={cn('w-full max-w-composer self-center', className)}
      >
        {children}
      </View>
    </View>
  );
}

export interface SessionLayoutProps {
  // Wide, the Session's PageHeader; a phone sets its native header from here.
  header: ReactNode;
  // Full pane width, so it scrolls from anywhere in the pane; its rows sit in SessionColumns.
  feed: ReactNode;
  composer: ReactNode;
}

// The Feed fades out above the Composer, and wide under the header too; every fade lies in the space it can be seen in. At its end, whether the reader is there.
export function useFeedFade(atEnd: boolean): ScrollFadeOptions {
  const wide = useWide();
  const glassComposer = useGlassComposer();
  return {
    edges: {
      // iOS 26's glass header shades the Feed scrolled under it; every other header is solid, so the Feed fades out below it.
      top: wide || !hasLiquidGlass ? 'scrolled' : 'never',
      bottom: glassComposer ? 'never' : 'always',
    },
    depth: {
      top: wide ? headerFadeDepth : undefined,
      bottom: atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away,
    },
    inset: { bottom: composerOverlap },
    surfaceClassName: sessionSurface,
  };
}

// One Session in one container on one surface: the header at the top, the Composer pinned to the bottom, and the Feed filling and scrolling between them.
export function SessionLayout(props: SessionLayoutProps): React.JSX.Element {
  return useGlassComposer() ? (
    <GlassComposerLayout {...props} />
  ) : (
    <OverlapComposerLayout {...props} />
  );
}

// The Composer overlaps the Feed's end, where the Feed fades out.
function OverlapComposerLayout({
  header,
  feed,
  composer,
}: SessionLayoutProps): React.JSX.Element {
  return (
    <Screen
      testID="session-layout"
      edges={['bottom']}
      // Wide, the shell already paints this surface, with the glow behind the glass reaching under the pane, so the container lets it show.
      className={cn(sessionSurface, 'wide:bg-transparent')}
    >
      {header}
      <KeyboardAvoidingContent>
        <View className="relative min-h-0 flex-1">{feed}</View>
        <View
          className="relative z-10 wide:pb-4"
          style={{ marginTop: -composerOverlap }}
        >
          <SessionColumn testID="composer-column" className="items-center">
            <BottomSheetAnchor>{composer}</BottomSheetAnchor>
          </SessionColumn>
        </View>
      </KeyboardAvoidingContent>
    </Screen>
  );
}

// The Feed runs to the screen's bottom edge and scrolls under the glass Composer, which keeps the home indicator's space below it until the keyboard opens.
function GlassComposerLayout({
  header,
  feed,
  composer,
}: SessionLayoutProps): React.JSX.Element {
  const { bottom } = useSafeAreaInsets();
  const { cover, onComposerLayout } = useGlassCover(bottom);
  const { progress } = useReanimatedKeyboardAnimation();
  const homeIndicatorSpace = useAnimatedStyle(
    () => ({ paddingBottom: bottom * (1 - progress.get()) }),
    [bottom, progress],
  );
  return (
    <Screen testID="session-layout" edges={[]} className={sessionSurface}>
      {header}
      <KeyboardAvoidingContent>
        {/* Its own box, so the Composer laid over its end stays above the keyboard's padding. */}
        <View className="relative min-h-0 flex-1">
          <ComposerCover.Provider value={cover}>{feed}</ComposerCover.Provider>
          <Animated.View
            className="absolute bottom-0 left-0 right-0 z-10"
            style={homeIndicatorSpace}
          >
            <SessionColumn
              testID="composer-column"
              className="items-center"
              // Measured without the home indicator's space, which follows the keyboard frame by frame.
              onLayout={onComposerLayout}
            >
              <BottomSheetAnchor>{composer}</BottomSheetAnchor>
            </SessionColumn>
          </Animated.View>
        </View>
      </KeyboardAvoidingContent>
    </Screen>
  );
}
