import type { useSessionFeed } from '#features/feed';
import {
  useSessionElicitation,
  useSessionPermission,
  useSessionPlanActions,
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
  permission: usePermissionWithPlan(sessionId, feed),
});

// A request to leave plan mode can also save its plan or build it in a new Session.
function usePermissionWithPlan(
  sessionId: string,
  feed: SessionFeed,
): FeedRequests['permission'] {
  const permission = useSessionPermission({
    sessionId,
    request: feed.snapshot?.pendingPermission,
    resumeAfterCommand: feed.resumeAfterCommand,
  });

  const plan = useSessionPlanActions({ sessionId, snapshot: feed.snapshot });

  return permission && { ...permission, ...plan };
}
