import type {
  BlobRef,
  ConversationPartial,
  LiveHeader as LiveHeaderValue,
  ToolCallUpdate,
} from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { ComposerCover } from '#lib/product/composer-cover';
import { useContentWide } from '#lib/product/content-layout';
import type { FeedViewItem } from '../../view/feed-view';
import { usePartialTranscripts } from '../../view/use-partial-transcripts';
import { drawnFeedItems } from '../drawn-feed-item';
import { FeedImages } from '../feed-images';
import { withoutDisclosedTurnEnds } from '../turn-end/turn-end';
import { newestKeyOf, withLiveHeader } from './feed-entry';
import { FeedList, type FeedListProps } from './feed-list';
import { FeedTrayInset } from './feed-row';
import { useExitingLiveHeader } from './use-exiting-live-header';
import { useReportsAtEnd } from './use-feed-scroll-position';

export interface FeedProps {
  sessionId?: string;
  items: readonly FeedViewItem[];
  partials?: readonly ConversationPartial[];
  // The Conversation is on this Session, including the interval between utterances.
  conversationActive?: boolean;
  // The Turn's live line, drawn last while a Turn runs and no open group already draws the work.
  liveHeader: LiveHeaderValue | null;
  // The Feed row a `tool_call` live header names, for its icon.
  liveToolCall?: ToolCallUpdate;
  loadingOlder: boolean;
  hasOlder?: boolean;
  historyCursor?: number | null;
  // Asks for older rows when the reader nears the top.
  onStartReached: () => void;
  imageUrl: (blob: BlobRef) => string;
  // The checkout's branch, under the empty Feed's heading.
  checkoutBranch?: string;
  // Fixes the live header's clock, for stories and tests.
  now?: number;
  // Opens a Subagent row's Feed, where the Session offers one.
  onOpenSubagent?: (subagentSessionId: string) => void;
  // Whether the reader can see the Feed's end; an empty Feed always shows it.
  onAtEndChange?: (atEnd: boolean) => void;
  // A Feed read without a Composer, such as a Subagent's: it opens on the first row, pins no prompt and does not follow the end, and nothing at its end clears a Composer.
  opensAtStart?: boolean;
}

function EmptyFeed({ branch }: { branch?: string }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-1.5 p-6">
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={2}
        className="wide-type:text-base wide-type:leading-6"
      >
        What should we build?
      </Text>
      {!!branch && <Text role="secondary">{branch}</Text>}
    </View>
  );
}

// An empty Feed's end is always on screen.
function EmptyFeedAtEnd({
  onAtEndChange,
  ...props
}: {
  branch?: string;
  onAtEndChange?: FeedProps['onAtEndChange'];
}): React.JSX.Element {
  useReportsAtEnd(true, onAtEndChange);

  return <EmptyFeed {...props} />;
}

function useDrawnItems(items: FeedProps['items']): FeedViewItem[] {
  return useMemo(
    () => drawnFeedItems(withoutDisclosedTurnEnds(items)),
    [items],
  );
}

function useFeedEntries(
  props: FeedProps,
): Pick<FeedListProps, 'entries' | 'newestKey' | 'turnRunning'> {
  const { liveHeader, liveToolCall, sessionId } = props;
  const drawnItems = useDrawnItems(props.items);

  const entries = useMemo(
    () => withLiveHeader(drawnItems, liveHeader, liveToolCall),
    [drawnItems, liveHeader, liveToolCall],
  );

  const turnRunning = liveHeader !== null;
  const visible = useExitingLiveHeader(entries, sessionId, turnRunning);

  return { entries: visible, newestKey: newestKeyOf(drawnItems), turnRunning };
}

// What a Feed read without a Composer leaves for one at its end.
const noComposerCover = 0;

// A Session's rows, oldest first, from the top of the view: it opens at the newest, follows the end while an answer streams in, and keeps the reader's place when older rows page in above.
export function Feed({
  partials,
  items,
  ...props
}: FeedProps): React.JSX.Element {
  const drawn = usePartialTranscripts(items, props.sessionId, partials);

  return <DrawFeed {...props} items={drawn} />;
}

const DrawFeed = memo(function DrawFeed({
  checkoutBranch,
  ...props
}: Omit<FeedProps, 'partials'>): React.JSX.Element {
  const feed = useFeedEntries(props);

  if (!feed.entries.length)
    return (
      <EmptyFeedAtEnd
        branch={checkoutBranch}
        onAtEndChange={props.onAtEndChange}
      />
    );

  return <FeedWithImages {...props} {...feed} />;
});

// The Feed's images open above its list, so one stays open when its row scrolls out and is no longer drawn.
function FeedWithImages(props: FeedListProps & FeedProps): React.JSX.Element {
  return (
    <FeedImages items={props.items} imageUrl={props.imageUrl}>
      <FeedWithCover {...props} />
    </FeedImages>
  );
}

// A Feed that opens at its start has no Composer at its end, so it keeps no room for one.
function FeedWithCover(props: FeedListProps): React.JSX.Element {
  const wide = useContentWide();

  if (!props.opensAtStart)
    return (
      <FeedTrayInset.Provider value={wide}>
        <FeedList {...props} />
      </FeedTrayInset.Provider>
    );

  return (
    <ComposerCover.Provider value={noComposerCover}>
      <FeedList {...props} />
    </ComposerCover.Provider>
  );
}
