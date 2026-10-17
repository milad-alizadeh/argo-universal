import type { useSessionFeed } from '#features/feed';
import {
  useSessionElicitation,
  useSessionPermission,
} from '#features/sessions';
import type { SessionDetailViewSources } from './session-detail-view-props';

type FeedRequests = Pick<
  SessionDetailViewSources,
  'elicitation' | 'permission'
>;

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Agent's open Permission request and Elicitation, each answered through the Server.
export const useFeedRequests = (
  sessionId: string,
  feed: SessionFeed,
): FeedRequests => ({
  elicitation: useSessionElicitation({
    sessionId,
    request: feed.snapshot?.pendingElicitation,
    resumeAfterCommand: feed.resumeAfterCommand,
  }),
  permission: useSessionPermission({
    sessionId,
    request: feed.snapshot?.pendingPermission,
    resumeAfterCommand: feed.resumeAfterCommand,
  }),
});
