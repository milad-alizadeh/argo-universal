import type { ToolCallUpdate } from '@repo/contracts';
import type { useSessionFeed } from '#features/feed';
import type { PermissionRequestProps } from '#features/requests';
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

// Argo Operations carry their own details; Agent requests use their matching Tool's input.
function permissionDetails(
  permission: PermissionRequestProps | undefined,
  tool: ToolCallUpdate | undefined,
): Pick<PermissionRequestProps, 'input' | 'reason'> {
  if (!permission || permission.request.operation) return {};

  return toolDetails(tool);
}

function toolDetails(
  tool: ToolCallUpdate | undefined,
): Pick<PermissionRequestProps, 'input' | 'reason'> {
  if (!tool) return {};

  return { input: toolInput(tool), reason: toolReason(tool) };
}

function toolInput(tool: ToolCallUpdate): string | undefined {
  const terminal = tool.content.find((block) => block.type === 'terminal');

  return terminal?.command ?? rawInput(tool);
}

const rawInput = (tool: ToolCallUpdate): string | undefined =>
  tool.rawInput === undefined
    ? undefined
    : JSON.stringify(tool.rawInput, null, 2);

const toolReason = (tool: ToolCallUpdate): string | undefined =>
  tool._meta?.argo?.description;
