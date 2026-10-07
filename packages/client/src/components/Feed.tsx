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
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
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
  // The checkout's branch, under the empty Feed's heading.
  emptyBranch?: string;
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

function EmptyFeed({ branch }: { branch?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-1.5 p-6">
      <Text role="heading" aria-level={2} className="text-base font-semibold">
        What should we build?
      </Text>
      {!!branch && (
        <Text className="font-mono text-xs leading-5 text-muted-foreground">
          {branch}
        </Text>
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

// In screens from the end: only a reader at the very end is followed.
const endThreshold = 0.02;

// In screens from the top: older rows load this far ahead of the reader.
const startThreshold = 2;

// One column as wide as the Composer, centred in the pane.
const column = 'w-full max-w-composer self-center';

const fill = { flex: 1 };
const fillShrinkable = { flex: 1, minHeight: 0 };

// A row's collapsibles re-measure it each frame they move, so the list keeps the rows below in step.
function FeedRow({
  onMotion,
  children,
}: {
  onMotion: (moving: boolean) => void;
  children: ReactNode;
}) {
  const syncLayout = useSyncLayout();
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
  emptyBranch,
  ...props
}: FeedProps) {
  const drawn = useMemo(() => items.filter(isDrawnFeedItem), [items]);
  const entries = useMemo<FeedEntry[]>(
    () =>
      liveHeader
        ? [
            ...drawn,
            { type: 'live_header', liveHeader, toolCall: liveToolCall },
          ]
        : drawn,
    [drawn, liveHeader, liveToolCall],
  );
  if (!entries.length) return <EmptyFeed branch={emptyBranch} />;
  const newest = drawn.at(-1);
  return (
    <FeedList
      entries={entries}
      newestKey={newest ? feedItemKey(newest) : ''}
      {...props}
    />
  );
}

type FeedListProps = Pick<
  FeedProps,
  'loadingOlder' | 'onStartReached' | 'imageUrl' | 'now'
> & {
  entries: FeedEntry[];
  // The newest row's key, so a row arriving while the reader is away marks Jump to latest.
  newestKey: string;
};

function FeedList({
  entries,
  newestKey,
  loadingOlder,
  onStartReached,
  imageUrl,
  now,
}: FeedListProps) {
  const wide = useWide();
  const list = useRef<LegendListRef>(null);
  // Opens on the newest row by estimated sizes, then a frame later at the very end; from there `followEnd` keeps it there as rows measure.
  const [initialIndex] = useState(entries.length - 1);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToEnd({ animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  // The list asks for older rows once until the reader scrolls well away, so a reader still near the top asks again as each page lands.
  const askOlderNearTop = useEffectEvent(() => {
    if (list.current?.getState().isNearStart) onStartReached();
  });
  const firstKey = entries[0] && entryKey(entries[0]);
  useEffect(() => askOlderNearTop(), [firstKey]);

  // The newest row's key when the reader left the end, or null while they are at it.
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const onEndChange = useEffectEvent((within: boolean) =>
    setLeftAt(within ? null : newestKey),
  );
  useEffect(
    () =>
      list.current
        ?.getState()
        .listen('isWithinMaintainScrollAtEndThreshold', onEndChange),
    [],
  );

  // How many collapsibles are opening or closing; while any are, the Feed holds still.
  const [moving, setMoving] = useState(0);
  const onMotion = useCallback((started: boolean) => {
    if (started) {
      setMoving((count) => count + 1);
      return;
    }
    // A frame later, once the list has the final size: Legend checks the end only on scroll, so check it first, or the stale answer follows to the end.
    requestAnimationFrame(() => {
      list.current?.reportContentInset();
      setMoving((count) => count - 1);
    });
  }, []);

  const jumpToLatest = useCallback(
    () => list.current?.scrollToEnd({ animated: true }),
    [],
  );
  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<FeedEntry>) => (
      <FeedRow onMotion={onMotion}>
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
    [imageUrl, now, onMotion],
  );

  return (
    <View style={fillShrinkable}>
      <LegendList
        ref={list}
        {...listTestId('feed-scroll')}
        style={fill}
        contentContainerStyle={wide ? wideContentStyle : phoneContentStyle}
        data={entries}
        keyExtractor={entryKey}
        renderItem={renderItem}
        estimatedItemSize={48}
        // Each row keeps its own expanded state, which a recycled row would inherit.
        recycleItems={false}
        initialScrollIndex={initialIndex}
        alignItemsAtEnd
        // Rows measure taller than estimated and streaming text grows them; at the end, the Feed stays there.
        maintainScrollAtEnd={moving ? holdEnd : followEnd}
        maintainScrollAtEndThreshold={endThreshold}
        maintainVisibleContentPosition={keepPosition}
        // Older rows load two screens ahead of the top, and rows draw a screen beyond the view, so reading back never waits.
        onStartReached={onStartReached}
        onStartReachedThreshold={startThreshold}
        drawDistance={800}
        ListFooterComponent={FeedEnd}
        // Dragging the Feed takes the keyboard down: with the finger on iOS, at once on Android.
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
      />
      {leftAt !== null && (
        <JumpToLatest unread={leftAt !== newestKey} onPress={jumpToLatest} />
      )}
      {/* Over the list, so keeping the reading position never scrolls it out of view. */}
      {loadingOlder && (
        <View className="absolute top-4 self-center rounded-full bg-background px-2 wide:top-6">
          <LoadingEarlier />
        </View>
      )}
    </View>
  );
}
