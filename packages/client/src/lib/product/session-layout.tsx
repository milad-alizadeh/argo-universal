import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { cn } from '#lib/generic/utils';
import { useWide } from '../generic/use-wide/use-wide';
import { keyboardAvoidingStyle, Screen } from './screen/screen';
import { ScrollFadeFrame } from './scroll-fade/scroll-fade-frame';

// The one surface a Session sits on, the same on a phone and in a window. The screen and the Feed's native fades take it from here.
const sessionSurface = 'bg-sidebar';

// How far the Composer reaches up over the end of the Feed; the Feed's rows are hidden under it, so none shows through its glass.
const composerOverlap = 48;

// The Feed fades out within the space it leaves above the Composer, so a row is gone before it meets the Composer: at the end only through the empty 24 under the last row, so that row stays whole; scrolled back, deeper.
const composerFadeDepth = { atEnd: 24, away: 48 };

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

interface FeedFadeProps {
  // Whether the reader is at the Feed's start, where nothing hides above, and at its end.
  atStart: boolean;
  atEnd: boolean;
  // The Feed's scroll view alone, so Jump to latest and the loading pill over it stay whole.
  children: ReactNode;
}

// The Feed fades out above the Composer, and wide under the header too; every fade lies in the space it can be seen in.
export function FeedFade({
  atStart,
  atEnd,
  children,
}: FeedFadeProps): React.JSX.Element {
  const wide = useWide();
  return (
    <ScrollFadeFrame
      edges={{ top: wide && !atStart, bottom: true }}
      depth={{
        top: headerFadeDepth,
        bottom: atEnd ? composerFadeDepth.atEnd : composerFadeDepth.away,
      }}
      inset={{ bottom: composerOverlap }}
      surfaceClassName={sessionSurface}
      className="min-h-0 flex-1"
    >
      {children}
    </ScrollFadeFrame>
  );
}

// One Session in one container on one surface: the header at the top, the Composer pinned to the bottom, and the Feed filling and scrolling between them.
export function SessionLayout({
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
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        // Above an open keyboard the Composer keeps the 16 it has from the screen's sides.
        keyboardVerticalOffset={16}
        style={keyboardAvoidingStyle}
      >
        <View className="relative min-h-0 flex-1">{feed}</View>
        <View
          className="relative z-10 wide:pb-4"
          style={{ marginTop: -composerOverlap }}
        >
          <SessionColumn testID="composer-column" className="items-center">
            {composer}
          </SessionColumn>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
