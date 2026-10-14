import type { FeedChange, PendingPermission } from '@repo/contracts';
import { acpToolCallRowId } from './acp/tools';
import {
  messageRejectedEvent,
  messageRejectedNotice,
  type MessageRejectedEvent,
} from './rejected-message';

export const turnEndingEvent = 'feed.turnEnding';

export const permissionsCancelledEvent = 'feed.permissionsCancelled';

export const permissionSelectedEvent = 'feed.permissionSelected';

export type TurnEndingNotice =
  | {
      kind: 'agent_crash';
      occurredAt: number;
      crashCount: number;
      description?: string;
    }
  | { kind: 'interruption' }
  | { kind: 'cancel_timeout' };

type TurnEndingEvent =
  | {
      type: typeof turnEndingEvent;
      turnId: string | null;
      ending: TurnEndingNotice;
    }
  | {
      type: typeof permissionsCancelledEvent;
      turnId: string | null;
      acpSessionId: string;
      toolCallIds: readonly string[];
    }
  | {
      type: typeof permissionSelectedEvent;
      turnId: string | null;
      acpSessionId: string;
      toolCallId: string;
      option: PendingPermission['options'][number];
    };

type NoticeFields = { id: string; title: string; description?: string };

type EndingFeedChange = {
  type: 'feed.change';
  turnId: string | null;
  change: FeedChange;
};

export const interruptionDisclosureId = (turnId: string): string =>
  `${turnId}:interrupted`;

const crashNotice = (
  sessionId: string,
  ending: Extract<TurnEndingNotice, { kind: 'agent_crash' }>,
): NoticeFields => {
  const fields: NoticeFields = {
    id: `${sessionId}:crash:${ending.occurredAt}:${ending.crashCount}`,
    title: 'The Agent stopped unexpectedly',
  };

  if (ending.description !== undefined) fields.description = ending.description;

  return fields;
};

const interruptionNotice = (turnId: string | null): NoticeFields => ({
  id: interruptionDisclosureId(turnId ?? ''),
  title: 'Output may be missing',
  description:
    'The Turn was interrupted, so its output may be missing. Argo did not resend the prompt.',
});

const endingNoticeFields = (
  sessionId: string,
  turnId: string | null,
  ending: TurnEndingNotice,
): NoticeFields => {
  if (ending.kind === 'agent_crash') return crashNotice(sessionId, ending);

  if (ending.kind === 'interruption') return interruptionNotice(turnId);

  return {
    id: `${turnId}:cancel-timeout`,
    title: 'The Agent did not stop after cancellation',
  };
};

export const turnEndingNotice = (
  sessionId: string,
  turnId: string | null,
  ending: TurnEndingNotice,
): FeedChange => ({
  type: 'upsert',
  update: {
    ...endingNoticeFields(sessionId, turnId, ending),
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'warning',
  },
});

export const cancelledPermissionOutcome = (
  acpSessionId: string,
  toolCallId: string,
): FeedChange => ({
  type: 'patch',
  id: acpToolCallRowId(acpSessionId, toolCallId),
  set: { _meta: { argo: { permissionOutcome: { outcome: 'cancelled' } } } },
});

// Permission outcomes use the ACP-scoped Tool call identity.
const selectedPermissionOutcome = (
  acpSessionId: string,
  toolCallId: string,
  option: PendingPermission['options'][number],
): FeedChange => ({
  type: 'patch',
  id: acpToolCallRowId(acpSessionId, toolCallId),
  set: {
    _meta: { argo: { permissionOutcome: { outcome: 'selected', ...option } } },
  },
});

type PermissionEvent = Exclude<
  TurnEndingEvent,
  { type: typeof turnEndingEvent }
>;

const permissionOutcomes = (event: PermissionEvent): FeedChange[] =>
  event.type === permissionSelectedEvent
    ? [
        selectedPermissionOutcome(
          event.acpSessionId,
          event.toolCallId,
          event.option,
        ),
      ]
    : event.toolCallIds.map((id) =>
        cancelledPermissionOutcome(event.acpSessionId, id),
      );

// Events the Session sends for Feed to turn into rows.
export type SessionRowEvent = TurnEndingEvent | MessageRejectedEvent;

export const sessionRowEvents: readonly SessionRowEvent['type'][] = [
  turnEndingEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
  messageRejectedEvent,
];

type RowSource = { sessionId: string; createId: () => string };

const eventFeedChanges = (
  feed: RowSource,
  event: SessionRowEvent,
): FeedChange[] => {
  if (event.type === turnEndingEvent)
    return [turnEndingNotice(feed.sessionId, event.turnId, event.ending)];

  if (event.type === messageRejectedEvent)
    return [messageRejectedNotice(feed.createId(), event.reason)];

  return permissionOutcomes(event);
};

export const sessionEventChanges = (
  feed: RowSource,
  event: SessionRowEvent,
): EndingFeedChange[] => {
  const { turnId } = event;
  const changes = eventFeedChanges(feed, event);

  return changes.map((change) => ({ type: 'feed.change', turnId, change }));
};
