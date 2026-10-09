import type * as React from 'react';
import { View } from 'react-native';
import { FeedItem } from '../src/components/feed-item';
import { feedItemKey } from '../src/feed/feed-view';
import { toFeedView } from '../src/feed/to-feed-view';
import { acpContentRows } from './acp-feed-content';
import { recordedFeedMock, type MockAgent } from './feed-message-mock';

export function AcpFeedContentPreview({
  agent,
}: {
  agent: MockAgent;
}): React.JSX.Element {
  const view = toFeedView(
    acpContentRows(agent),
    recordedFeedMock(agent, 'markdown-answer').snapshot,
  );
  return (
    <View className="w-full max-w-composer gap-4">
      {view.items.map((item) => (
        <FeedItem key={feedItemKey(item)} item={item} imageUrl={() => ''} />
      ))}
    </View>
  );
}
