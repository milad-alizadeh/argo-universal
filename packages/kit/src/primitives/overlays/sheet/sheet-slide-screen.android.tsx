import type { ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '#kit/utils';
import { SheetBody } from './sheet-body';
import type { SheetProps } from './sheet-props';
import { SheetScreenHeader } from './sheet-screen-header';
import type { SheetScreenEntry, SheetStack } from './sheet-screens';
import { useScreenSlide, type SlideMotion } from './sheet-slide.android';

export type ScreensProps = SheetProps & { stack: SheetStack };

export type FrameProps = ScreensProps & {
  fill: boolean;
  width: number;
  height?: number;
};

export type ScreenProps = FrameProps & {
  page: SheetScreenEntry;
  // The page's own place among the pages, which is both where it is laid out and where it slides from.
  index: number;
  root: boolean;
  // False while the pages are sliding: a pushed page stands in for itself until the motion stops.
  settled: boolean;
  motion: SlideMotion;
};

const screenStyle = (width: number): ViewStyle => ({ width, flexShrink: 0 });

export function SlideScreen(props: ScreenProps): ReactElement {
  const slide = useScreenSlide(props.motion, props.index, props.width);

  return (
    <Animated.View style={[screenStyle(props.width), slide]}>
      <ScreenHeader {...props} />
      <ScreenContent {...props} />
    </Animated.View>
  );
}

// A root page with no title of its own draws no header; a pushed page always does, for its way back.
const hideHeader = (props: ScreenProps): boolean =>
  props.root && !props.page.title;

// Only the root page closes the sheet; every page above it goes back to the one below instead.
const screenClose = (props: ScreenProps): (() => void) | undefined =>
  props.root ? props.stack.navigation.close : undefined;

function ScreenHeader(props: ScreenProps): ReactElement | null {
  return (
    <SheetScreenHeader
      page={props.page}
      stack={props.stack}
      hidden={hideHeader(props)}
      root={props.root}
      onClose={screenClose(props)}
    />
  );
}

/*
 * A pushed page draws the rows it is about to hold until the slide has stopped, so the motion carries a page
 * of the right shape and the list's own layout lands on a row that is standing still.
 */
function ScreenContent(props: ScreenProps): ReactElement {
  if (sliding(props)) return <ScreenPlaceholder {...props} />;

  return (
    <SheetBody
      {...props}
      contentScrolls={props.page.contentScrolls ?? props.contentScrolls}
    >
      {props.page.content}
    </SheetBody>
  );
}

/*
 * The root page is drawn before the sheet is shown, and a page on standby was drawn with it, so only a page
 * the sheet mounts on the way in has anything to stand in for.
 */
const sliding = (
  props: Pick<ScreenProps, 'root' | 'settled' | 'page'>,
): boolean => !props.root && !props.settled && props.page.standby !== true;

const loadingLabel = 'Loading';

/*
 * What the page stands in for while it slides: the rows it declared, drawn as bars. A page that declared
 * none draws nothing rather than a spinner, because a spinner in a sliding page is two motions at once.
 */
function ScreenPlaceholder(
  props: Pick<ScreenProps, 'fill' | 'page'>,
): ReactElement {
  return (
    <View
      accessibilityLabel={loadingLabel}
      className={cn('py-2', props.fill && 'flex-1')}
    >
      {props.page.placeholder}
    </View>
  );
}
