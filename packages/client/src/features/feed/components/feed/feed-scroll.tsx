import type {
  LegendListRef,
  LegendListProps,
  LegendListRenderItemProps,
} from '@legendapp/list/react-native';
import type * as React from 'react';
import { type RefObject, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { useFeedFade } from '#lib/product/feed-fade';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { type FeedEntry, entryKey, entryType } from './feed-entry';
import { type EntryDrawing, FeedRow, type RowMotion } from './feed-row';
import { LoadingEarlier } from './loading-earlier';
import { useCollapsibleMotion } from './use-collapsible-motion';

// Stable objects, since Legend List lays out again whenever its content style changes. Rows hold the side padding, which Legend List drops on web.
const phoneContentStyle = { paddingTop: 16 };

const wideContentStyle = { paddingTop: 24 };

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

// LegendList pins a list it once measured under 10 wide, such as under an expanded Inspector, to its widest row; the pane's width overrides that pin.
const fill = { flex: 1, minWidth: '100%' } as const;

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
  ...listTestIdProps('feed-scroll'),
  style: fill,
  keyExtractor: entryKey,
  estimatedItemSize: 48,
  // Each kind keeps its own average size, so a row not yet measured lands near its real place.
  getItemType: entryType,
  // Each row keeps its own expanded state, which a recycled row would inherit.
  recycleItems: false,
  alignItemsAtEnd: true,
  maintainScrollAtEndThreshold: endThreshold,
  maintainVisibleContentPosition: keepPosition,
  // Older rows load two screens ahead of the top, and rows draw a screen beyond the view, so reading back never waits.
  onStartReachedThreshold: startThreshold,
  drawDistance: 800,
  ListFooterComponent: FeedEnd,
  ...keyboardProps,
};

type RenderEntry = (
  props: LegendListRenderItemProps<FeedEntry>,
) => React.JSX.Element;

function useRenderEntry(
  entries: FeedEntry[],
  { imageUrl, now, onMotionChange, onGrow }: EntryDrawing & RowMotion,
): RenderEntry {
  return useCallback(
    ({ item, index }: LegendListRenderItemProps<FeedEntry>) => (
      <FeedRow
        entry={item}
        next={entries[index + 1]}
        {...{ imageUrl, now, onMotionChange, onGrow }}
      />
    ),
    [entries, imageUrl, now, onMotionChange, onGrow],
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
}

type FeedListProps = Pick<
  LegendListProps<FeedEntry>,
  | 'contentContainerStyle'
  | 'data'
  | 'renderItem'
  | 'initialScrollIndex'
  | 'maintainScrollAtEnd'
  | 'onStartReached'
  | 'ListHeaderComponent'
>;

function useFeedListProps(
  list: ListRef,
  { entries, ...props }: Omit<FeedScrollProps, 'list' | 'atEnd'>,
): FeedListProps {
  const { maintainScrollAtEnd, ...motion } = useCollapsibleMotion(list);

  return {
    contentContainerStyle: useWide() ? wideContentStyle : phoneContentStyle,
    data: entries,
    renderItem: useRenderEntry(entries, { ...props, ...motion }),
    initialScrollIndex: props.initialIndex,
    // Rows measure taller than estimated and streaming text grows them; at the end, the Feed stays there.
    maintainScrollAtEnd,
    onStartReached: props.onStartReached,
    ListHeaderComponent: <LoadingEarlier loading={props.loadingOlder} />,
  };
}

export function FeedScroll({
  list,
  atEnd,
  ...props
}: FeedScrollProps): React.JSX.Element {
  const listProps = useFeedListProps(list, props);

  return (
    <ScrollFadeList
      ref={list}
      {...feedListProps}
      {...listProps}
      {...useFeedFade(atEnd)}
    />
  );
}
