import type * as React from 'react';
import { Feed } from '#features/feed';
import type { StartingFeed } from '#features/sessions';
import { NewSessionQuestion } from '#lib/product/new-session-question';

const noOlderRows = (): void => {};

// The sent prompt and Working while the Session starts, else the question.
interface NewSessionFeedProps {
  starting?: StartingFeed;
  context?: React.ReactNode;
}

export function NewSessionFeed({
  starting,
  context,
}: NewSessionFeedProps): React.JSX.Element {
  if (!starting) return <NewSessionQuestion>{context}</NewSessionQuestion>;

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
