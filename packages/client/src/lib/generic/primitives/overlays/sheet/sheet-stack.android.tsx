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
import { fillsHeight, sheetModifiers } from './sheet-sizing.android';
import { useRetainedPages } from './sheet-slide-pages.android';
import { useSlide } from './sheet-slide.android';
import { SheetTitleRow } from './sheet-title-row';

type PagesProps = SheetProps & { stack: SheetStack };

type FrameProps = PagesProps & { fill: boolean; width: number };

type PageProps = FrameProps & {
  page: SheetPageEntry;
  root: boolean;
  // False while the row is sliding: a pushed page stands in for itself until the motion stops.
  settled: boolean;
};

/*
 * Compose holds the sheet and nothing else: the header, the pages and the slide between them are all React
 * Native, so a page and its title move as one and a list inside a page scrolls as a list anywhere else does
 * — there is no Compose scroller between the finger and the rows to hand the drag to (owner, 2026-10-20).
 */
export function SheetPages(props: PagesProps): ReactElement {
  const fill = fillsHeight({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });

  return (
    <RNHostView matchContents={!fill} modifiers={sheetModifiers(fill)}>
      <SheetFrame {...props} fill={fill} />
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

function SlidingPages(props: FrameProps): ReactElement {
  const pages = useRetainedPages(props.stack, props.open);
  const depth = Math.min(props.stack.path.length, pages.length - 1);
  const slide = useSlide(depth, props.width);

  return (
    <View className={cn('overflow-hidden', props.fill && 'flex-1')}>
      <Animated.View style={[rowStyle(props, pages.length), slide.style]}>
        {slidePages(props, pages, slide.settled)}
      </Animated.View>
    </View>
  );
}

function slidePages(
  props: FrameProps,
  pages: SheetPageEntry[],
  settled: boolean,
): ReactElement[] {
  return pages.map((page, index) => (
    <SlidePage
      {...props}
      key={page.name}
      page={page}
      root={index === 0}
      settled={settled}
    />
  ));
}

/*
 * The row is as wide as all its pages together and each page keeps its own width, because a child of a row
 * that was told to fill would share the row's width with its siblings instead of holding a screen each.
 */
const rowStyle = (props: FrameProps, count: number): ViewStyle => ({
  flexDirection: 'row',
  width: props.width * count,
  ...(props.fill && { flex: 1 }),
});

const pageStyle = (width: number): ViewStyle => ({ width, flexShrink: 0 });

function SlidePage(props: PageProps): ReactElement {
  return (
    <View style={pageStyle(props.width)}>
      <PageHeader {...props} />
      <PageContent {...props} />
    </View>
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

// The root page is drawn before the sheet is shown, so only a pushed page stands in for itself.
const sliding = (props: Pick<PageProps, 'root' | 'settled'>): boolean =>
  !props.root && !props.settled;

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
