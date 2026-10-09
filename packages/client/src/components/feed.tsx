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
import type * as React from 'react';
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
import { Icon } from '../lib/icon';
import { listTestIdProps } from '../lib/list-test-id';
import { motionDuration } from '../lib/motion';
import { useWide } from '../navigation/use-wide';
import { type FeedGrowth, FeedGrowthContext } from './feed-growth-context';
import { FeedItem, isDrawnFeedItem } from './feed-item';
import { LiveHeader } from './live-header';
import { ShimmerText } from './shimmer-text';
import { WorkingMark } from './working-mark';

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
  checkoutBranch?: string;
  // Fixes the live header's clock, for stories and tests.
  now?: number;
}

function LoadingEarlier(): React.JSX.Element {
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

function EmptyFeed({ branch }: { branch?: string }): React.JSX.Element {
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
  hasNewRows,
  onPress,
}: {
  hasNewRows: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Animated.View
      entering={FadeIn.duration(motionDuration.tooltipEnter)}
      exiting={FadeOut.duration(motionDuration.exit)}
      className="absolute bottom-16 self-center"
    >
      <Pressable
        role="button"
        accessibilityLabel={
          hasNewRows ? 'Jump to latest, new rows' : 'Jump to latest'
        }
        onPress={onPress}
        className="size-8 items-center justify-center rounded-full border border-border bg-card shadow-[0_1px_2px_#0000000f,0_4px_12px_-4px_#00000014] active:opacity-70"
      >
        <Icon as={ArrowDownIcon} className="text-foreground" />
        {hasNewRows && (
          <View className="absolute -top-px -right-px size-[9px] rounded-full border-2 border-card bg-info" />
        )}
      </Pressable>
    </Animated.View>
  );
}

// Stable objects, since Legend List lays out again whenever its content style changes. Rows hold the side padding, which Legend List drops on web.
const phoneContentStyle = { paddingTop: 16 };
const wideContentStyle = { paddingTop: 24 };

// Paper's 72 (wide 60) clear the Composer's overlap; a footer, since `alignItemsAtEnd` ignores bottom padding.
function FeedEnd(): React.JSX.Element {
  return <View className="h-18 wide:h-15" />;
}

// Streaming rows grow at the end, so the Feed follows rows as they measure.
const followEnd = { on: { dataChange: true, layout: true, itemLayout: true } };
// While a reader opens or closes a collapsible it holds still, so opening one at the end grows below instead of scrolling the page up.
const holdEnd = { on: { dataChange: true, layout: true } };
// Older rows paging in above keep the reader's place, and so do rows above that measure as the reader scrolls.
const keepPosition = { data: true };

// While rows measure after content grows above the reader, the Feed holds their place: within this many pixels, for this many still frames, at most this long in milliseconds.
const placeTolerance = 0.5;
const settledFrames = 10;
const keepPlaceDuration = 500;

// In screens from the end: only a reader at the very end is followed.
const endThreshold = 0.02;

// In screens from the top: older rows load this far ahead of the reader.
const startThreshold = 2;

// One column as wide as the Composer, centred in the pane.
const columnClassName = 'w-full max-w-composer self-center';

const fill = { flex: 1 };
const fillShrinkable = { flex: 1, minHeight: 0 };

// A row's collapsibles resize it in the list each frame they move, so the rows below move in the same frame.
function FeedRow({
  itemKey,
  spaceBelow,
  onMotionChange,
  onGrow,
  children,
}: {
  itemKey: string;
  spaceBelow: string;
  onMotionChange: (moving: boolean) => void;
  onGrow: (itemKey: string, height: number) => void;
  children: ReactNode;
}): React.JSX.Element {
  const syncLayout = useSyncLayout();
  const layoutSync = useMemo(
    (): NonNullable<
      React.ContextType<typeof CollapsibleLayoutSyncContext>
    > => ({
      syncLayout,
      onMotionChange,
      grow: (height: number) => onGrow(itemKey, height),
    }),
    [syncLayout, onMotionChange, onGrow, itemKey],
  );
  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <View className="px-4 wide:px-6">
        <View className={`${columnClassName} ${spaceBelow}`}>{children}</View>
      </View>
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

const entryType = (
  entry: FeedEntry,
):
  | Exclude<FeedEntry['type'], 'row'>
  | Extract<FeedEntry, { type: 'row' }>['row']['sessionUpdate'] =>
  entry.type === 'row' ? entry.row.sessionUpdate : entry.type;

const entryKey = (entry: FeedEntry): string =>
  entry.type === 'live_header' ? 'live-header' : feedItemKey(entry);

// Thoughts, tool calls and the live header: what the Agent does between messages.
const isActivity = (entry: FeedEntry): boolean => entry.type !== 'row';

const isAgentMessage = (entry: FeedEntry | undefined): boolean =>
  entry?.type === 'row' && entry.row.sessionUpdate === 'agent_message';

// The Feed's rhythm, set below a row by the row after it, so older rows paging in above never resize a row the reader sees.
function spaceBelowEntry(
  entry: FeedEntry,
  next: FeedEntry | undefined,
): string {
  if (!next) return '';
  if (isActivity(entry) && isActivity(next)) return 'pb-2 wide:pb-1.5';
  if (isAgentMessage(entry) && isAgentMessage(next))
    return 'pb-paragraph wide:pb-paragraph-wide';
  return 'pb-6 wide:pb-5';
}

// Dragging the Feed takes the keyboard down: with the finger on iOS, at once on Android. Web's list is a plain element, which takes neither.
const keyboardProps = Platform.select({
  ios: {
    keyboardDismissMode: 'interactive',
    keyboardShouldPersistTaps: 'handled',
  },
  android: {
    keyboardDismissMode: 'on-drag',
    keyboardShouldPersistTaps: 'handled',
  },
  default: {},
} as const);

// A Session's rows, oldest first: it opens at the newest, follows new rows while the reader is at the bottom, and keeps their place when older rows page in above.
export function Feed({
  items,
  liveHeader,
  liveToolCall,
  checkoutBranch,
  ...props
}: FeedProps): React.JSX.Element {
  const drawnItems = useMemo(() => items.filter(isDrawnFeedItem), [items]);
  const entries = useMemo<FeedEntry[]>(
    () =>
      liveHeader
        ? [
            ...drawnItems,
            { type: 'live_header', liveHeader, toolCall: liveToolCall },
          ]
        : drawnItems,
    [drawnItems, liveHeader, liveToolCall],
  );
  if (!entries.length) return <EmptyFeed branch={checkoutBranch} />;
  const newestItem = drawnItems.at(-1);
  return (
    <FeedList
      entries={entries}
      newestKey={newestItem ? feedItemKey(newestItem) : ''}
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
}: FeedListProps): React.JSX.Element {
  const wide = useWide();
  const list = useRef<LegendListRef>(null);
  // Opens on the newest row by estimated sizes, then a frame later at the very end; from there `followEnd` keeps it there as rows measure.
  const [initialIndex] = useState(entries.length - 1);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToEnd({ animated: false }),
    );
    return (): void => cancelAnimationFrame(frame);
  }, []);

  // The list asks for older rows once until the reader scrolls well away, so a reader still near the top asks again as each page lands.
  const requestOlderIfNearTop = useEffectEvent(() => {
    if (list.current?.getState().isNearStart) onStartReached();
  });
  const oldestKey = entries[0] && entryKey(entries[0]);
  const askedAtOldestKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (askedAtOldestKey.current === oldestKey) return;
    askedAtOldestKey.current = oldestKey;
    requestOlderIfNearTop();
  }, [oldestKey]);

  // Null while the reader is at the end.
  const [newestKeyWhenLeftEnd, setNewestKeyWhenLeftEnd] = useState<
    string | null
  >(null);
  const onAtEndChange = useEffectEvent((atEnd: boolean) =>
    setNewestKeyWhenLeftEnd(atEnd ? null : newestKey),
  );
  useEffect(
    () =>
      list.current
        ?.getState()
        .listen('isWithinMaintainScrollAtEndThreshold', onAtEndChange),
    [],
  );

  // While any collapsible is opening or closing, the Feed holds still.
  const [movingCollapsibles, setMovingCollapsibles] = useState(0);
  const onMotionChange = useCallback((started: boolean) => {
    if (started) {
      setMovingCollapsibles((count) => count + 1);
      return;
    }
    // A frame later, once the list has the final size: Legend checks the end only on scroll, so check it first, or the stale answer follows to the end.
    requestAnimationFrame(() => {
      list.current?.reportContentInset();
      setMovingCollapsibles((count) => count - 1);
    });
  }, []);
  // Called in the same frame as the collapsible's own height, so React commits the row and the rows below together; Legend's measure lands a frame late on native.
  const growRow = useCallback((itemKey: string, height: number) => {
    const size = list.current?.getState().sizes.get(itemKey);
    if (size === undefined) return;
    list.current?.setItemSize(itemKey, { height: size + height, width: 0 });
  }, []);

  // Legend keeps the first row fully in view still, so content added inside a row above the reader's line, the middle of the view, would push what they read down.
  const growthStarts = useRef(new Map<string, number>());
  const feedGrowth = useMemo<FeedGrowth>(
    (): FeedGrowth => ({
      willGrowAbove: (key) => {
        const state = list.current?.getState();
        const top = state?.positionByKey(key);
        if (!state || top === undefined) return;
        const bottom = top + (state.sizes.get(key) ?? 0);
        if (
          top < state.scroll + state.scrollLength / 2 &&
          bottom > state.scroll
        )
          growthStarts.current.set(key, top - state.scroll);
      },
      grewAbove: (key, height) => {
        const topInView = growthStarts.current.get(key);
        growthStarts.current.delete(key);
        if (topInView === undefined || height <= 0) return;
        // Until rows stop measuring, the row's old content stays where it was, whichever row Legend anchors.
        const startedAt = performance.now();
        let stillFrames = 0;
        const keepPlace = (): void => {
          const ref = list.current;
          const state = ref?.getState();
          const top = state?.positionByKey(key);
          if (!ref || !state || top === undefined) return;
          const offBy = top + height - topInView - state.scroll;
          if (Math.abs(offBy) > placeTolerance) {
            ref.setVisibleContentAnchorOffset((offset) => offset + offBy);
            stillFrames = 0;
          } else stillFrames += 1;
          if (
            stillFrames < settledFrames &&
            performance.now() - startedAt < keepPlaceDuration
          )
            requestAnimationFrame(keepPlace);
        };
        keepPlace();
      },
    }),
    [],
  );

  const jumpToLatest = useCallback(
    () => list.current?.scrollToEnd({ animated: true }),
    [],
  );
  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<FeedEntry>) => (
      <FeedRow
        itemKey={entryKey(item)}
        spaceBelow={spaceBelowEntry(item, entries[index + 1])}
        onMotionChange={onMotionChange}
        onGrow={growRow}
      >
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
    [entries, imageUrl, now, onMotionChange, growRow],
  );

  return (
    <View style={fillShrinkable}>
      <FeedGrowthContext.Provider value={feedGrowth}>
        <LegendList
          ref={list}
          {...listTestIdProps('feed-scroll')}
          style={fill}
          contentContainerStyle={wide ? wideContentStyle : phoneContentStyle}
          data={entries}
          keyExtractor={entryKey}
          renderItem={renderItem}
          estimatedItemSize={48}
          // Each kind keeps its own average size, so a row not yet measured lands near its real place.
          getItemType={entryType}
          // Each row keeps its own expanded state, which a recycled row would inherit.
          recycleItems={false}
          initialScrollIndex={initialIndex}
          alignItemsAtEnd
          // Rows measure taller than estimated and streaming text grows them; at the end, the Feed stays there.
          maintainScrollAtEnd={movingCollapsibles ? holdEnd : followEnd}
          maintainScrollAtEndThreshold={endThreshold}
          maintainVisibleContentPosition={keepPosition}
          // Older rows load two screens ahead of the top, and rows draw a screen beyond the view, so reading back never waits.
          onStartReached={onStartReached}
          onStartReachedThreshold={startThreshold}
          drawDistance={800}
          ListFooterComponent={FeedEnd}
          {...keyboardProps}
        />
      </FeedGrowthContext.Provider>
      {newestKeyWhenLeftEnd !== null && (
        <JumpToLatest
          hasNewRows={newestKeyWhenLeftEnd !== newestKey}
          onPress={jumpToLatest}
        />
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
