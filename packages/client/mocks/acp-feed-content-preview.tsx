import type * as React from 'react';
import { Feed } from '../src/components/feed';
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
    <Feed
      items={view.items}
      liveHeader={null}
      loadingOlder={false}
      onStartReached={() => {}}
      imageUrl={() => ''}
    />
  );
}
