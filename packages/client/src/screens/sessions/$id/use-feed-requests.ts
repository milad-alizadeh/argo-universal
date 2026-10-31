import type { useSessionFeed } from '#features/feed';
import {
  useSessionElicitation,
  useSessionPermission,
  useSessionPlanActions,
} from '#features/sessions';
import { permissionDetails } from './permission-details';
import type { SessionDetailViewSources } from './session-detail-view-props';

type FeedRequests = Pick<
  SessionDetailViewSources,
  'elicitation' | 'permission'
>;

type SessionFeed = ReturnType<typeof useSessionFeed>;

type PendingKey = 'pendingElicitation' | 'pendingPermission';

// The Agent's open request of one kind, and the Turn it asks in.
interface PendingRequest<Key extends PendingKey> {
  request: NonNullable<SessionFeed['snapshot']>[Key] | undefined;
  turnId: string | null | undefined;
}

const pending = <Key extends PendingKey>(
  feed: SessionFeed,
  key: Key,
): PendingRequest<Key> => ({
  request: feed.snapshot?.[key],
  turnId: feed.snapshot?.activeTurnId,
});

// The Agent's open Permission request and Elicitation, each answered through the Server.
export const useFeedRequests = (
  sessionId: string,
  feed: SessionFeed,
): FeedRequests => ({
  elicitation: useSessionElicitation({
    sessionId,
    ...pending(feed, 'pendingElicitation'),
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
    ...pending(feed, 'pendingPermission'),
    resumeAfterCommand: feed.resumeAfterCommand,
  });

  const plan = useSessionPlanActions({ sessionId, snapshot: feed.snapshot });
  const details = permissionDetails(permission, feed.permissionToolCall);

  return permission && { ...permission, ...details, ...plan };
}
