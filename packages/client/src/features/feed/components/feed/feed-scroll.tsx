import type { LegendListRef } from '@legendapp/list/react-native';
import { type ListProps } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import { type RefObject, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFeedFade } from '#lib/product/feed-fade';
import { feedRowViewability } from '../feed-row-visibility';
import type { FeedEntry } from './feed-entry';
import { type EntryDrawing, FeedRow, type RowMotion } from './feed-row';
import {
  androidRowType,
  type FeedRowData,
  rowKey,
  rowType,
  useFeedRowData,
} from './feed-row-data';
import { DrawFeedScroll, useFeedOnScroll } from './feed-scroll-drawing';
import { LoadingEarlier } from './loading-earlier';
import { useCollapsibleMotion } from './use-collapsible-motion';
import { useFeedAnchors } from './use-feed-anchors';
import { useFeedRowSize } from './use-feed-row-size';

// In screens from the end: only a reader at the very end is at the end, and follows the Composer.
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
export const feedListProps = {
  testID: 'feed-scroll',
  // SessionColumn owns each row's side gutter; the generic List adds none.
  padding: 0,
  paddingBottom: 0,
  paddingTop: { compact: 4, wide: 6 },
  keyExtractor: rowKey,
  estimatedItemSize: estimatedRowHeight,
  // Each kind keeps its own average size, so a row not yet measured lands near its real place.
  getItemType: rowType,
  recycleItems: true,
  maintainScrollAtEndThreshold: endThreshold,
  // Page in older rows before the reader reaches the start.
  onStartReachedThreshold: startThreshold,
  ...Platform.select({
    // Keep rows ready across direction changes without mounting too many in one Android frame.
    android: {
      drawDistance: 1600,
      decelerationRate: 'fast' as const,
      getItemType: androidRowType,
    },
    ios: { drawDistance: 2400, viewabilityConfig: feedRowViewability },
    default: { drawDistance: 800 },
  }),
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
  turnRunning: boolean;
  onStartReached: () => void;
  // Older rows are paging in above.
  loadingOlder: boolean;
  // Whether the reader is at the Feed's end, where its bottom fade is shallower.
  atEnd: boolean;
  // The Feed does not follow its end, for a Feed read without a Composer.
  opensAtStart?: boolean;
  sessionId?: string;
}

export type FeedListProps = Pick<
  Extract<ListProps<FeedRowData>, { items: readonly FeedRowData[] }>,
  | 'items'
  | 'renderItem'
  | 'getFixedItemSize'
  | 'initialScrollIndex'
  | 'renderScrollComponent'
  | 'maintainScrollAtEnd'
  | 'maintainVisibleContentPosition'
  | 'alignItemsAtEnd'
  | 'onStartReached'
  | 'endContent'
  | 'header'
>;

function useFeedListProps(input: FeedScrollProps): FeedListProps {
  const { list, entries, ...props } = input;
  const motion = useCollapsibleMotion(list);
  const items = useFeedRowData(entries);
  const anchors = useFeedAnchors(input);

  return {
    items,
    getFixedItemSize: useFeedRowSize(),
    renderItem: useRenderEntry({ ...props, ...motion }),
    initialScrollIndex: props.initialIndex,
    ...anchors,
    onStartReached: props.onStartReached,
    header: <LoadingEarlier loading={props.loadingOlder} />,
  };
}

export function FeedScroll(props: FeedScrollProps): React.JSX.Element {
  const { list, atEnd, sessionId } = props;
  const listProps = useFeedListProps(props);
  const onScroll = useFeedOnScroll(sessionId, list);

  const drawing = {
    base: feedListProps,
    list,
    listProps,
    fade: useFeedFade(atEnd),
    onScroll,
  };

  return <DrawFeedScroll {...drawing} />;
}
