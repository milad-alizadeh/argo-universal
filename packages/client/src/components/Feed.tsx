import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
  useSyncLayout,
} from '@legendapp/list/react-native';
import type {
  BlobRef,
  LiveHeader as LiveHeaderValue,
  ToolCallUpdate,
} from '@repo/contracts';
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CollapsibleLayoutSyncContext } from '#primitives/collapsible';
import { Text } from '#primitives/text';
import { type FeedViewItem, feedItemKey } from '../feed/feed-view';
import { listTestId } from '../lib/list-test-id';
import { useWide } from '../navigation/use-wide';
import { FeedItem, isDrawnFeedItem } from './FeedItem';
import { Icon } from './Icon';
import { LiveHeader } from './LiveHeader';
import { ShimmerText } from './ShimmerText';
import { WorkingMark } from './WorkingMark';

export interface FeedProps {
  items: readonly FeedViewItem[];
  // The Turn's live line, drawn last while a Turn runs.
  liveHeader: LiveHeaderValue | null;
  // The Feed row a `tool_call` live header names, for its icon.
  liveToolCall?: ToolCallUpdate;
  loadingOlder: boolean;
  // Asks for older rows when the reader nears the top.
  onStartReached: () => void;
  imageUrl: (blob: BlobRef) => string;
  // Under the empty Feed's heading, such as the branch.
  emptyDetail?: string;
  // Fixes the live header's clock, for stories and tests.
  now?: number;
}

function LoadingEarlier() {
  return (
    <View
      role="progressbar"
      accessibilityLabel="Loading earlier"
      className="h-5 flex-row items-center justify-center gap-1.5"
    >
      <WorkingMark />
      <ShimmerText
        text="Loading earlier"
        className="text-sm leading-5 text-foreground"
      />
    </View>
  );
}

function EmptyFeed({ detail }: { detail?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-1.5 p-6">
      <Text role="heading" aria-level={2} className="text-base font-semibold">
        What should we build?
      </Text>
      {!!detail && (
        <Text className="text-sm text-muted-foreground">{detail}</Text>
      )}
    </View>
  );
}

// Shown while the reader is away from the end; the dot marks rows that arrived since.
function JumpToLatest({
  unread,
  onPress,
}: {
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      className="absolute bottom-16 self-center"
    >
      <Pressable
        role="button"
        accessibilityLabel={
          unread ? 'Jump to latest, new rows' : 'Jump to latest'
        }
        onPress={onPress}
        className="size-8 items-center justify-center rounded-full border border-border bg-card shadow-[0_1px_2px_#0000000f,0_4px_12px_-4px_#00000014] active:opacity-70"
      >
        <Icon as={ArrowDownIcon} className="text-foreground" />
        {unread && (
          <View className="absolute -top-px -right-px size-[9px] rounded-full border-2 border-card bg-info" />
        )}
      </Pressable>
    </Animated.View>
  );
}

// Stable objects, since Legend List lays out again whenever its content style changes.
const phoneContentStyle = { paddingHorizontal: 16, paddingTop: 16 };
const wideContentStyle = { paddingHorizontal: 24, paddingTop: 24 };

// With the last row's own pb-4, Paper's 72 (wide 60) clear the Composer's overlap; a footer, since `alignItemsAtEnd` ignores bottom padding.
function FeedEnd() {
  return <View className="h-14 wide:h-11" />;
}

// Streaming rows grow at the end, so the Feed follows rows as they measure.
const followEnd = { on: { dataChange: true, layout: true, itemLayout: true } };
// While a reader opens or closes a collapsible it holds still, so opening one at the end grows below instead of scrolling the page up.
const holdEnd = { on: { dataChange: true, layout: true } };
// Older rows paging in above keep the reader's place, and so do rows above that measure as the reader scrolls.
const keepPosition = { data: true };
// While a collapsible moves only the rows below it shift, so measuring rows needs no correction.
const holdPosition = { data: true, size: false };

// In screens from the end: only a reader at the very end is followed.
const endThreshold = 0.02;

// In screens from the top: older rows load this far ahead of the reader.
const startThreshold = 2;

// One column as wide as the Composer, centred in the pane.
const column = 'w-full max-w-composer self-center';

const MotionContext = createContext<(moving: boolean) => void>(() => {});

// A row's collapsibles re-measure it each frame they move, so the list keeps the rows below in step.
function FeedRow({ children }: { children: ReactNode }) {
  const syncLayout = useSyncLayout();
  const onMotion = useContext(MotionContext);
  const layoutSync = useMemo(
    () => ({ syncLayout, onMotion }),
    [syncLayout, onMotion],
  );
  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <View className={`${column} pb-4`}>{children}</View>
    </CollapsibleLayoutSyncContext.Provider>
  );
}

// The live header is the list's last row, so the list measures it and follows it like any row.
type FeedEntry =
  | FeedViewItem
  | {
      type: 'live_header';
      liveHeader: LiveHeaderValue;
      toolCall?: ToolCallUpdate;
    };

const entryKey = (entry: FeedEntry) =>
  entry.type === 'live_header' ? 'live-header' : feedItemKey(entry);

// A Session's rows, oldest first: it opens at the newest, follows new rows while the reader is at the bottom, and keeps their place when older rows page in above.
export function Feed({
  items,
  liveHeader,
  liveToolCall,
  loadingOlder,
  onStartReached,
  imageUrl,
  emptyDetail,
  now,
}: FeedProps) {
  const entries = useMemo<FeedEntry[]>(() => {
    const drawn: FeedEntry[] = items.filter(isDrawnFeedItem);
    return liveHeader
      ? [...drawn, { type: 'live_header', liveHeader, toolCall: liveToolCall }]
      : drawn;
  }, [items, liveHeader, liveToolCall]);
  // Only the first render positions the list; later rows follow `maintainScrollAtEnd`.
  const [initialIndex] = useState(() =>
    entries.length ? entries.length - 1 : undefined,
  );
  const wide = useWide();
  const list = useRef<LegendListRef>(null);
  // The index lands on the last row's top by estimated sizes; from the very end, `followEnd` keeps it there as rows measure.
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToEnd({ animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const contentStyle = wide ? wideContentStyle : phoneContentStyle;
  // The list asks for older rows once until the reader scrolls well away, so a reader still near the top asks again as each page lands.
  const startReached = useRef(onStartReached);
  startReached.current = onStartReached;
  const firstKey = entries[0] && entryKey(entries[0]);
  useEffect(() => {
    if (!firstKey) return;
    const state = list.current?.getState();
    if (
      state?.scrollLength &&
      state.scroll < startThreshold * state.scrollLength
    )
      startReached.current();
  }, [firstKey]);
  // At the end the Feed follows new rows; scrolled away, it holds still and offers a way back.
  const [atEnd, setAtEnd] = useState(true);
  const [unread, setUnread] = useState(false);
  const ready = entries.length > 0;
  useEffect(() => {
    if (!ready) return;
    return list.current
      ?.getState()
      .listen('isWithinMaintainScrollAtEndThreshold', (within) => {
        setAtEnd(within);
        if (within) setUnread(false);
      });
  }, [ready]);
  const last = entries.at(-1);
  const lastKey = last && entryKey(last);
  const seenLastKey = useRef(lastKey);
  useEffect(() => {
    if (lastKey === seenLastKey.current) return;
    seenLastKey.current = lastKey;
    if (!atEnd) setUnread(true);
  }, [lastKey, atEnd]);
  // How many collapsibles are opening or closing.
  const moving = useRef(0);
  const [holding, setHolding] = useState(false);
  const onMotion = useCallback((started: boolean) => {
    moving.current += started ? 1 : -1;
    if (started) {
      setHolding(true);
      return;
    }
    // A frame later, once the list has the final size: Legend checks the end only on scroll, so check it first, or the stale answer follows to the end.
    requestAnimationFrame(() => {
      if (moving.current) return;
      list.current?.reportContentInset();
      setHolding(false);
    });
  }, []);
  const jumpToLatest = useCallback(
    () => list.current?.scrollToEnd({ animated: true }),
    [],
  );
  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<FeedEntry>) => (
      <FeedRow>
        {item.type === 'live_header' ? (
          <LiveHeader
            liveHeader={item.liveHeader}
            toolCall={item.toolCall}
            now={now}
          />
        ) : (
          <FeedItem item={item} imageUrl={imageUrl} />
        )}
      </FeedRow>
    ),
    [imageUrl, now],
  );

  if (!entries.length) return <EmptyFeed detail={emptyDetail} />;
  return (
    <View className="flex-1" style={{ minHeight: 0 }}>
      <MotionContext.Provider value={onMotion}>
        <LegendList
          ref={list}
          {...listTestId('feed-scroll')}
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          data={entries}
          keyExtractor={entryKey}
          renderItem={renderItem}
          estimatedItemSize={48}
          // Each row keeps its own expanded state, which a recycled row would inherit.
          recycleItems={false}
          initialScrollIndex={initialIndex}
          alignItemsAtEnd
          // Rows measure taller than estimated and streaming text grows them; at the end, the Feed stays there.
          maintainScrollAtEnd={holding ? holdEnd : followEnd}
          maintainScrollAtEndThreshold={endThreshold}
          maintainVisibleContentPosition={holding ? holdPosition : keepPosition}
          // Older rows load two screens ahead of the top, and rows draw a screen beyond the view, so reading back never waits.
          onStartReached={onStartReached}
          onStartReachedThreshold={startThreshold}
          drawDistance={800}
          ListFooterComponent={FeedEnd}
          // Dragging the Feed takes the keyboard down: with the finger on iOS, at once on Android.
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          keyboardShouldPersistTaps="handled"
        />
      </MotionContext.Provider>
      {!atEnd && <JumpToLatest unread={unread} onPress={jumpToLatest} />}
      {/* Over the list, so keeping the reading position never scrolls it out of view. */}
      {loadingOlder && (
        <View className="absolute top-4 self-center rounded-full bg-background px-2 wide:top-6">
          <LoadingEarlier />
        </View>
      )}
    </View>
  );
}
