import type { ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '#lib/generic/utils';
import { SheetBody } from './sheet-body';
import { backLabel } from './sheet-page-label';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { usePageSlide, type SlideMotion } from './sheet-slide.android';
import { SheetTitleRow } from './sheet-title-row';

export type PagesProps = SheetProps & { stack: SheetStack };

export type FrameProps = PagesProps & {
  fill: boolean;
  width: number;
  height?: number;
};

export type PageProps = FrameProps & {
  page: SheetPageEntry;
  // The page's own place among the pages, which is both where it is laid out and where it slides from.
  index: number;
  root: boolean;
  // False while the pages are sliding: a pushed page stands in for itself until the motion stops.
  settled: boolean;
  motion: SlideMotion;
};

const pageStyle = (width: number): ViewStyle => ({ width, flexShrink: 0 });

export function SlidePage(props: PageProps): ReactElement {
  const slide = usePageSlide(props.motion, props.index, props.width);

  return (
    <Animated.View style={[pageStyle(props.width), slide]}>
      <PageHeader {...props} />
      <PageContent {...props} />
    </Animated.View>
  );
}

// A root page with no title of its own draws no header; a pushed page always does, for its way back.
const hideHeader = (props: PageProps): boolean =>
  props.root && !props.page.title;

const pageBackLabel = (props: PageProps): string | undefined =>
  props.root ? undefined : backLabel(props.stack);

// Only the root page closes the sheet; every page above it goes back to the one below instead.
const pageClose = (props: PageProps): (() => void) | undefined =>
  props.root ? props.stack.navigation.close : undefined;

function PageHeader(props: PageProps): ReactElement | null {
  if (hideHeader(props)) return null;

  return (
    <SheetTitleRow
      title={props.page.title}
      action={props.page.action}
      backLabel={pageBackLabel(props)}
      onBack={props.stack.navigation.back}
      onClose={pageClose(props)}
    />
  );
}

/*
 * A pushed page draws the rows it is about to hold until the slide has stopped, so the motion carries a page
 * of the right shape and the list's own layout lands on a row that is standing still.
 */
function PageContent(props: PageProps): ReactElement {
  if (sliding(props)) return <PagePlaceholder {...props} />;

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
  props: Pick<PageProps, 'root' | 'settled' | 'page'>,
): boolean => !props.root && !props.settled && props.page.standby !== true;

const loadingLabel = 'Loading';

/*
 * What the page stands in for while it slides: the rows it declared, drawn as bars. A page that declared
 * none draws nothing rather than a spinner, because a spinner in a sliding page is two motions at once.
 */
function PagePlaceholder(
  props: Pick<PageProps, 'fill' | 'page'>,
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
