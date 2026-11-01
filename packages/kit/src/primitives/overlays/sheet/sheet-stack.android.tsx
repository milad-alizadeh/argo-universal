import { RNHostView } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import { cn } from '#kit/utils';
import { CompactScope } from '../../../use-size-class/compact-scope';
import { SheetBody } from './sheet-body';
import type { SheetScreenEntry } from './sheet-screens';
import {
  sheetModifiers,
  sheetSizing,
  wrapsContents,
} from './sheet-sizing.android';
import {
  SlideScreen,
  type FrameProps,
  type ScreenProps,
  type ScreensProps,
} from './sheet-slide-screen.android';
import { useRetainedScreens } from './sheet-slide-screens.android';
import { useSlide, type Slide } from './sheet-slide.android';

/*
 * Compose holds the sheet and nothing else: the header, the pages and the slide between them are all React
 * Native, so a page and its title move as one and a list inside a page scrolls as a list anywhere else does
 * — there is no Compose scroller between the finger and the rows to hand the drag to (owner, 2026-10-20).
 */
export function SheetScreens(props: ScreensProps): ReactElement {
  const sizing = sheetSizing({
    detents: props.detents,
    paged: props.stack.declared > 1,
    window: useWindowDimensions().height,
  });

  return (
    <RNHostView
      matchContents={wrapsContents(sizing)}
      modifiers={sheetModifiers(sizing)}
    >
      <SheetFrame {...props} {...sizing} />
    </RNHostView>
  );
}

// Material's BottomSheetDefaults.SheetMaxWidth, in dp: a tablet's sheet stops at it and centres.
const materialSheetMaxWidth = 640;

// A phone-sized sheet on a tablet too, so compact.
function SheetFrame(props: Omit<FrameProps, 'width'>): ReactElement {
  const width = Math.min(useWindowDimensions().width, materialSheetMaxWidth);

  return (
    <View
      style={{ width, height: props.height }}
      className={cn(props.fill && 'flex-1')}
    >
      <CompactScope>
        <SheetPane {...props} width={width} />
      </CompactScope>
    </View>
  );
}

function SheetPane(props: FrameProps): ReactElement {
  if (props.stack.pages.length === 0)
    return <SheetBody {...props}>{props.children}</SheetBody>;

  return <SlidingScreens {...props} />;
}

/*
 * The pages keep their places side by side, so none of them is laid out again to be moved, but each carries
 * its own transform rather than riding one that moves them all. Travelling two places used to drag the page
 * between them right across the reader's view; now only the page being left and the page being gone to move,
 * and the rest wait a screen's width off to one side (owner, 2026-10-21).
 */
function SlidingScreens(props: FrameProps): ReactElement {
  const { pages, slot } = useRetainedScreens(props.stack, props.open);
  const slide = useSlide(slot);

  return (
    <View className={cn('overflow-hidden', props.fill && 'flex-1')}>
      <View style={rowStyle(props, pages.length)}>
        {slideScreens(props, pages, slide)}
      </View>
    </View>
  );
}

function slideScreens(
  props: FrameProps,
  pages: SheetScreenEntry[],
  slide: Slide,
): ReactElement[] {
  return pages.map((page, index) => (
    <SlideScreen {...props} {...placed(page, index, slide)} key={page.name} />
  ));
}

// What a page is told of where it sits and what the pages are doing, over and above the frame they share.
const placed = (
  page: SheetScreenEntry,
  index: number,
  slide: Slide,
): Pick<ScreenProps, 'page' | 'index' | 'root' | 'settled' | 'motion'> => ({
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
