import { RNHostView } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '#lib/generic/utils';
import { CompactScope } from '../../../use-size-class/compact-scope';
import { SheetBody } from './sheet-body';
import { backLabel } from './sheet-page-label';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { sheetFill, sheetModifiers } from './sheet-sizing.android';
import { useRetainedPages } from './sheet-slide-pages.android';
import {
  usePageSlide,
  useSlide,
  type Slide,
  type SlideMotion,
} from './sheet-slide.android';
import { SheetTitleRow } from './sheet-title-row';

type PagesProps = SheetProps & { stack: SheetStack };

type FrameProps = PagesProps & { fill: boolean; width: number };

type PageProps = FrameProps & {
  page: SheetPageEntry;
  // The page's own place among the pages, which is both where it is laid out and where it slides from.
  index: number;
  root: boolean;
  // False while the pages are sliding: a pushed page stands in for itself until the motion stops.
  settled: boolean;
  motion: SlideMotion;
};

/*
 * Compose holds the sheet and nothing else: the header, the pages and the slide between them are all React
 * Native, so a page and its title move as one and a list inside a page scrolls as a list anywhere else does
 * — there is no Compose scroller between the finger and the rows to hand the drag to (owner, 2026-10-20).
 */
export function SheetPages(props: PagesProps): ReactElement {
  const fill = sheetFill({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });

  return (
    <RNHostView
      matchContents={fill === undefined}
      modifiers={sheetModifiers(fill)}
    >
      <SheetFrame {...props} fill={fill !== undefined} />
    </RNHostView>
  );
}

// Material's BottomSheetDefaults.SheetMaxWidth, in dp: a tablet's sheet stops at it and centres.
const materialSheetMaxWidth = 640;

// A phone-sized sheet on a tablet too, so compact.
function SheetFrame(props: PagesProps & { fill: boolean }): ReactElement {
  const width = Math.min(useWindowDimensions().width, materialSheetMaxWidth);

  return (
    <View style={{ width }} className={cn(props.fill && 'flex-1')}>
      <CompactScope>
        <SheetPane {...props} width={width} />
      </CompactScope>
    </View>
  );
}

function SheetPane(props: FrameProps): ReactElement {
  if (props.stack.pages.length === 0)
    return <SheetBody {...props}>{props.children}</SheetBody>;

  return <SlidingPages {...props} />;
}

/*
 * The pages keep their places side by side, so none of them is laid out again to be moved, but each carries
 * its own transform rather than riding one that moves them all. Travelling two places used to drag the page
 * between them right across the reader's view; now only the page being left and the page being gone to move,
 * and the rest wait a screen's width off to one side (owner, 2026-10-21).
 */
function SlidingPages(props: FrameProps): ReactElement {
  const { pages, slot } = useRetainedPages(props.stack, props.open);
  const slide = useSlide(slot);

  return (
    <View className={cn('overflow-hidden', props.fill && 'flex-1')}>
      <View style={rowStyle(props, pages.length)}>
        {slidePages(props, pages, slide)}
      </View>
    </View>
  );
}

function slidePages(
  props: FrameProps,
  pages: SheetPageEntry[],
  slide: Slide,
): ReactElement[] {
  return pages.map((page, index) => (
    <SlidePage {...props} {...placed(page, index, slide)} key={page.name} />
  ));
}

// What a page is told of where it sits and what the pages are doing, over and above the frame they share.
const placed = (
  page: SheetPageEntry,
  index: number,
  slide: Slide,
): Pick<PageProps, 'page' | 'index' | 'root' | 'settled' | 'motion'> => ({
  page,
  index,
  root: index === 0,
  settled: slide.settled,
  motion: slide.motion,
});

/*
 * The row is as wide as all its pages together and each page keeps its own width, because a child of a row
 * that was told to fill would share the row's width with its siblings instead of holding a screen each. The
 * row itself never moves: it is only what gives every page the same height, the tallest one's.
 */
const rowStyle = (props: FrameProps, count: number): ViewStyle => ({
  flexDirection: 'row',
  width: props.width * count,
  ...(props.fill && { flex: 1 }),
});

const pageStyle = (width: number): ViewStyle => ({ width, flexShrink: 0 });

function SlidePage(props: PageProps): ReactElement {
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

function PageHeader(props: PageProps): ReactElement | null {
  if (hideHeader(props)) return null;

  return (
    <SheetTitleRow
      title={props.page.title}
      action={props.page.action}
      backLabel={pageBackLabel(props)}
      onBack={props.stack.navigation.back}
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
