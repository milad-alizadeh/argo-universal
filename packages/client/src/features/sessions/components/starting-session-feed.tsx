import type * as React from 'react';
import { Feed } from '#features/feed';
import type { StartingFeed } from '../state/starting-feed';

const noOlderRows = (): void => {};

// The first prompt as sent and Working, while the Session it opens starts.
export function StartingSessionFeed({
  starting,
}: {
  starting: StartingFeed;
}): React.JSX.Element {
  return (
    <Feed
      items={starting.items}
      liveHeader={starting.liveHeader}
      imageUrl={starting.imageUrl}
      loadingOlder={false}
      onStartReached={noOlderRows}
    />
  );
}
