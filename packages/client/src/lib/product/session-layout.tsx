import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type ViewProps,
  type ViewStyle,
  View,
  type ViewInstance,
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ComposerCover,
  composerOverlap,
  useGlassComposer,
  useGlassCover,
} from './composer-cover';
import { type DroppedFiles, FileDropPane } from './file-drop/file-drop-pane';
import { KeyboardAvoidingContent, Screen } from './screen/screen';
import { ComposerColumn, sessionSurface } from './session-column';
import {
  filledClass,
  SessionFillProvider,
  useSessionFill,
} from './session-fill';

export interface SessionLayoutProps {
  // Draws nothing itself: the Session's Screen header is the band's on a wide window and the stack's on a phone, and what this holds only claims the band's Workbench.
  header: ReactNode;
  // Full pane width, so it scrolls from anywhere in the pane; its rows sit in SessionColumns.
  feed: ReactNode;
  composer: ReactNode;
  // Under the Composer at full pane width, such as a sign-in terminal; a phone presents it as a sheet.
  panel?: ReactNode;
  // Files dropped anywhere on the pane below the header, Composer included, attach to the draft; without it, nothing accepts them.
  onDropFiles?: (dropped: DroppedFiles) => void;
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

// Wide, the Frame already paints this surface, so the container lets it show.
const overlapSurface = cn(sessionSurface, 'wide:bg-transparent');

const bottomEdge = ['bottom'] as const;

// The Composer overlaps the Feed's end, where the Feed fades out.
function OverlapComposerLayout(props: SessionLayoutProps): React.JSX.Element {
  return (
    <Screen
      testID="session-layout"
      edges={bottomEdge}
      className={overlapSurface}
    >
      {props.header}
      <OverlapContent {...props} />
    </Screen>
  );
}

// A filled Composer hides the Feed and takes its height; the Feed stays mounted, so it keeps its place.
function OverlapContent(props: SessionLayoutProps): React.JSX.Element {
  const [filled, setFilled] = useState(false);
  const fill = useMemo(() => ({ filled, setFilled }), [filled]);
  // The Screen holds the bottom safe area clear, and the keyboard opens over it.
  const { bottom } = useSafeAreaInsets();

  return (
    <SessionFillProvider value={fill}>
      <KeyboardAvoidingContent inset={bottom}>
        <OverlapPane {...props} />
        {props.panel}
      </KeyboardAvoidingContent>
    </SessionFillProvider>
  );
}

// The Feed and the Composer, one drop target for files.
function OverlapPane(props: SessionLayoutProps): React.JSX.Element {
  const { filled } = useSessionFill();

  return (
    <FileDropPane
      feed={props.feed}
      hideFeed={filled}
      onDropFiles={props.onDropFiles}
    >
      <OverlapComposer>{props.composer}</OverlapComposer>
    </FileDropPane>
  );
}

/*
 * A window has no home indicator to lift the Composer off its bottom edge, so on the web and desktop at every width,
 * and on a wide tablet, the Composer keeps the column's side gap below it too.
 */
const composerBottomGap = 'web:pb-4 wide:pb-4';

function OverlapComposer(props: { children: ReactNode }): React.JSX.Element {
  const { filled } = useSessionFill();

  return (
    <View
      className={cn(
        'relative z-10',
        composerBottomGap,
        filled && `${filledClass} pt-4`,
      )}
      style={filled ? undefined : overlapComposerStyle}
    >
      <ComposerColumn fill={filled}>{props.children}</ComposerColumn>
    </View>
  );
}

// The Feed runs to the screen's bottom edge behind the glass Composer, which keeps the home indicator's space below it until the keyboard opens.
function GlassComposerLayout(props: SessionLayoutProps): React.JSX.Element {
  return (
    <Screen testID="session-layout" edges={[]} className={sessionSurface}>
      {props.header}
      <KeyboardAvoidingContent>
        <GlassComposerStage feed={props.feed} composer={props.composer} />
        {props.panel}
      </KeyboardAvoidingContent>
    </Screen>
  );
}

type SessionStageProps = Pick<SessionLayoutProps, 'feed' | 'composer'>;

// Its own box, so the Composer laid over its end stays above the keyboard's padding.
function GlassComposerStage(props: SessionStageProps): React.JSX.Element {
  const { bottom } = useSafeAreaInsets();
  const { cover, measureComposer, onComposerLayout } = useGlassCover(bottom);

  return (
    <View className="relative min-h-0 flex-1">
      <ComposerCover.Provider value={cover}>
        {props.feed}
      </ComposerCover.Provider>
      <GlassComposer measure={measureComposer} onLayout={onComposerLayout}>
        {props.composer}
      </GlassComposer>
    </View>
  );
}

interface GlassComposerProps extends Pick<ViewProps, 'onLayout' | 'children'> {
  measure: (view: ViewInstance | null) => void;
}

// The Composer column is measured without the home indicator's space, which follows the keyboard frame by frame.
function GlassComposer({
  measure,
  ...props
}: GlassComposerProps): React.JSX.Element {
  const homeIndicatorSpace = useHomeIndicatorSpace();

  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 z-10"
      style={homeIndicatorSpace}
    >
      <ComposerColumn {...props} ref={measure} />
    </Animated.View>
  );
}

function useHomeIndicatorSpace(): ReturnType<
  typeof useAnimatedStyle<ViewStyle>
> {
  const { bottom } = useSafeAreaInsets();
  const { progress } = useReanimatedKeyboardAnimation();

  return useAnimatedStyle(
    () => ({ paddingBottom: bottom * (1 - progress.get()) }),
    [bottom, progress],
  );
}
