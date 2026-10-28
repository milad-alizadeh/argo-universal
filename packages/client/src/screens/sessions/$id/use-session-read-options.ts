import { useResubscribeOnReconnect } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import { useSessionOptions } from '#features/sessions';

type SessionFeed = ReturnType<typeof useSessionFeed>;

function optionsInput(
  sessionId: string,
  snapshot: SessionFeed['snapshot'],
): Parameters<typeof useSessionOptions>[0] {
  if (!snapshot)
    return { agent: undefined, projectId: undefined, sessionId, picks: {} };

  return {
    agent: snapshot.agent,
    projectId: snapshot.projectId,
    sessionId,
    picks: {},
  };
}

// A refused Session open retries when the Connection reopens; its callout already says why.
export function useSessionReadOptions(
  sessionId: string,
  feed: SessionFeed,
): ReturnType<typeof useSessionOptions> {
  const options = useSessionOptions(optionsInput(sessionId, feed.snapshot));
  useResubscribeOnReconnect({
    status: feed.openError ? 'error' : 'idle',
    reset: feed.retryOpen,
  });

  return options;
}
