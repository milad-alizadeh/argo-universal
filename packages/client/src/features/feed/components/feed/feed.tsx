import type {
  BlobRef,
  LiveHeader as LiveHeaderValue,
  ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import type { FeedViewItem } from '../../view/feed-view';
import { isDrawnFeedItem } from '../feed-item';
import { newestKeyOf, withLiveHeader } from './feed-entry';
import { FeedList, type FeedListProps } from './feed-list';

export interface FeedProps {
  items: readonly FeedViewItem[];
  // The Turn's live line, drawn last while a Turn runs and no open group already draws the work.
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

function EmptyFeed({ branch }: { branch?: string }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-1.5 p-6">
      <Text semanticRole="heading" aria-level={2}>
        What should we build?
      </Text>
      {!!branch && (
        <Text role="code" className="text-muted-foreground">
          {branch}
        </Text>
      )}
    </View>
  );
}

function useFeedEntries({
  items,
  liveHeader,
  liveToolCall,
}: FeedProps): Pick<FeedListProps, 'entries' | 'newestKey'> {
  const drawnItems = useMemo(() => items.filter(isDrawnFeedItem), [items]);

  const entries = useMemo(
    () => withLiveHeader(drawnItems, liveHeader, liveToolCall),
    [drawnItems, liveHeader, liveToolCall],
  );

  return { entries, newestKey: newestKeyOf(drawnItems) };
}

// A Session's rows, oldest first: it opens at the newest, follows new rows while the reader is at the bottom, and keeps their place when older rows page in above.
export function Feed({
  checkoutBranch,
  ...props
}: FeedProps): React.JSX.Element {
  const feed = useFeedEntries(props);

  if (!feed.entries.length) return <EmptyFeed branch={checkoutBranch} />;

  return <FeedList {...props} {...feed} />;
}
