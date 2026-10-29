import type { LegendListRef } from '@legendapp/list/react-native';
import { List, type ListProps } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import { type RefObject, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { useFeedFade } from '#lib/product/feed-fade';
import { type FeedEntry } from './feed-entry';
import { type EntryDrawing, FeedRow, type RowMotion } from './feed-row';
import {
  type FeedRowData,
  rowKey,
  rowType,
  useFeedRowData,
} from './feed-row-data';
import { LoadingEarlier } from './loading-earlier';
import { useCollapsibleMotion } from './use-collapsible-motion';

// Clears whatever of the Composer covers the Feed's end and leaves the Feed's gap above it; a footer, since `alignItemsAtEnd` ignores bottom padding.
function FeedEnd(): React.JSX.Element {
  const { endSpace } = useFeedEndClearance();

  return <View style={{ height: endSpace }} />;
}

// Older rows paging in above keep the reader's place, and so do rows above that measure as the reader scrolls.
const keepPosition = { data: true };

// In screens from the end: only a reader at the very end is followed.
const endThreshold = 0.02;

// In screens from the top: older rows load this far ahead of the reader.
const startThreshold = 2;

/*
 * What a row that has not been measured is worth. The recorded Feeds average 91px a row in the 800px
 * column and 138px on a phone, and one number serves both, so this sits between them rather than at
 * either. It only places rows above the opening view; each kind takes its own measured average after
 * that.
 */
const estimatedRowHeight = 112;

// Dragging the Feed takes the keyboard down: with the finger on iOS, at once on Android. Web's list is a plain element, which takes neither.
const keyboardProps = Platform.select({
  ios: {
    // Under iOS 26's transparent header, the Feed starts below it and scrolls on under the glass.
    contentInsetAdjustmentBehavior: 'automatic',
    keyboardDismissMode: 'interactive',
    keyboardShouldPersistTaps: 'handled',
  },
  android: {
    keyboardDismissMode: 'on-drag',
    keyboardShouldPersistTaps: 'handled',
  },
  default: {},
} as const);

// What the Feed's list takes whatever the Session draws.
const feedListProps = {
  testID: 'feed-scroll',
  // SessionColumn owns each row's side gutter; the generic List adds none.
  padding: 0,
  paddingBottom: 0,
  paddingTop: { compact: 4, wide: 6 },
  keyExtractor: rowKey,
  estimatedItemSize: estimatedRowHeight,
  // Each kind keeps its own average size, so a row not yet measured lands near its real place.
  getItemType: rowType,
  // Each row keeps its own expanded state, which a recycled row would inherit.
  recycleItems: false,
  maintainScrollAtEndThreshold: endThreshold,
  maintainVisibleContentPosition: keepPosition,
  // Older rows load two screens ahead of the top, and rows draw a screen beyond the view, so reading back never waits.
  onStartReachedThreshold: startThreshold,
  drawDistance: 800,
  endContent: <FeedEnd />,
  ...keyboardProps,
} satisfies Partial<ListProps<FeedRowData>>;

type RenderEntry = (row: FeedRowData) => React.JSX.Element;

// What a row needs to draw itself: its content and the motion it reports.
type RowDrawing = EntryDrawing & RowMotion;

const drawRow = (row: FeedRowData, drawing: RowDrawing): React.JSX.Element => (
  <FeedRow {...row} {...drawing} />
);

function useRenderEntry({
  imageUrl,
  now,
  onOpenSubagent,
  onMotionChange,
  onGrow,
}: RowDrawing): RenderEntry {
  return useCallback(
    (row: FeedRowData) =>
      drawRow(row, { imageUrl, now, onOpenSubagent, onMotionChange, onGrow }),
    [imageUrl, now, onOpenSubagent, onMotionChange, onGrow],
  );
}

type ListRef = RefObject<LegendListRef | null>;

export interface FeedScrollProps extends EntryDrawing {
  list: ListRef;
  entries: FeedEntry[];
  initialIndex: number;
  onStartReached: () => void;
  // Older rows are paging in above.
  loadingOlder: boolean;
  // Whether the reader is at the Feed's end, where its bottom fade is shallower.
  atEnd: boolean;
  // Rows start at the top and the Feed does not follow its end, for a Feed read without a Composer.
  alignAtTop?: boolean;
}

type FeedListProps = Pick<
  Extract<ListProps<FeedRowData>, { items: readonly FeedRowData[] }>,
  | 'items'
  | 'renderItem'
  | 'initialScrollIndex'
  | 'maintainScrollAtEnd'
  | 'alignItemsAtEnd'
  | 'onStartReached'
  | 'header'
>;

function useFeedListProps(
  list: ListRef,
  { entries, ...props }: Omit<FeedScrollProps, 'list' | 'atEnd'>,
): FeedListProps {
  const { maintainScrollAtEnd, ...motion } = useCollapsibleMotion(list);

  return {
    items: useFeedRowData(entries),
    renderItem: useRenderEntry({ ...props, ...motion }),
    initialScrollIndex: props.initialIndex,
    // Rows measure taller than estimated and streaming text grows them; at the end, the Feed stays there. Aligned at the top, it stays where the reader is.
    maintainScrollAtEnd: props.alignAtTop ? false : maintainScrollAtEnd,
    // Rows rest against the Composer below them, or against the top when there is none.
    alignItemsAtEnd: !props.alignAtTop,
    onStartReached: props.onStartReached,
    header: <LoadingEarlier loading={props.loadingOlder} />,
  };
}

export function FeedScroll({
  list,
  atEnd,
  ...props
}: FeedScrollProps): React.JSX.Element {
  const listProps = useFeedListProps(list, props);

  return (
    <List
      ref={list}
      {...feedListProps}
      {...listProps}
      {...useFeedFade(atEnd)}
    />
  );
}
