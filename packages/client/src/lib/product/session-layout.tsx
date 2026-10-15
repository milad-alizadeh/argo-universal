import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '#lib/generic/utils';
import {
  ComposerCover,
  composerOverlap,
  useGlassComposer,
  useGlassCover,
} from './composer-cover';
import { KeyboardAvoidingContent, Screen } from './screen/screen';
import { ComposerColumn, sessionSurface } from './session-column';

export interface SessionLayoutProps {
  // Wide, the Session's PageHeader; a phone sets its native header from here.
  header: ReactNode;
  // Full pane width, so it scrolls from anywhere in the pane; its rows sit in SessionColumns.
  feed: ReactNode;
  composer: ReactNode;
}

// One Session in one container on one surface: the header at the top, the Composer pinned to the bottom, and the Feed filling and scrolling between them.
export function SessionLayout(props: SessionLayoutProps): React.JSX.Element {
  return useGlassComposer() ? (
    <GlassComposerLayout {...props} />
  ) : (
    <OverlapComposerLayout {...props} />
  );
}

const overlapComposerStyle = { marginTop: -composerOverlap };

// The Composer overlaps the Feed's end, where the Feed fades out.
function OverlapComposerLayout(props: SessionLayoutProps): React.JSX.Element {
  return (
    <Screen
      testID="session-layout"
      edges={['bottom']}
      // Wide, the Frame already paints this surface, with the glow behind the glass reaching under the pane, so the container lets it show.
      className={cn(sessionSurface, 'wide:bg-transparent')}
    >
      {props.header}
      <KeyboardAvoidingContent>
        <View className="relative min-h-0 flex-1">{props.feed}</View>
        <OverlapComposer>{props.composer}</OverlapComposer>
      </KeyboardAvoidingContent>
    </Screen>
  );
}

function OverlapComposer(props: { children: ReactNode }): React.JSX.Element {
  return (
    <View className="relative z-10 wide:pb-4" style={overlapComposerStyle}>
      <ComposerColumn>{props.children}</ComposerColumn>
    </View>
  );
}

// The Feed runs to the screen's bottom edge and scrolls under the glass Composer, which keeps the home indicator's space below it until the keyboard opens.
function GlassComposerLayout(props: SessionLayoutProps): React.JSX.Element {
  return (
    <Screen testID="session-layout" edges={[]} className={sessionSurface}>
      {props.header}
      <KeyboardAvoidingContent>
        <GlassComposerStage feed={props.feed} composer={props.composer} />
      </KeyboardAvoidingContent>
    </Screen>
  );
}

type SessionStageProps = Pick<SessionLayoutProps, 'feed' | 'composer'>;

// Its own box, so the Composer laid over its end stays above the keyboard's padding.
function GlassComposerStage(props: SessionStageProps): React.JSX.Element {
  const { bottom } = useSafeAreaInsets();
  const { cover, onComposerLayout } = useGlassCover(bottom);

  return (
    <View className="relative min-h-0 flex-1">
      <ComposerCover.Provider value={cover}>
        {props.feed}
      </ComposerCover.Provider>
      <GlassComposer bottom={bottom} onLayout={onComposerLayout}>
        {props.composer}
      </GlassComposer>
    </View>
  );
}

interface GlassComposerProps extends Pick<ViewProps, 'onLayout' | 'children'> {
  bottom: number;
}

// The Composer column is measured without the home indicator's space, which follows the keyboard frame by frame.
function GlassComposer(props: GlassComposerProps): React.JSX.Element {
  const homeIndicatorSpace = useHomeIndicatorSpace(props.bottom);

  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 z-10"
      style={homeIndicatorSpace}
    >
      <ComposerColumn onLayout={props.onLayout}>
        {props.children}
      </ComposerColumn>
    </Animated.View>
  );
}

function useHomeIndicatorSpace(
  bottom: number,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const { progress } = useReanimatedKeyboardAnimation();

  return useAnimatedStyle(
    () => ({ paddingBottom: bottom * (1 - progress.get()) }),
    [bottom, progress],
  );
}
