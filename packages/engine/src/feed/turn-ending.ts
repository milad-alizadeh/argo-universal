import type { FeedChange } from '@repo/contracts';
import { acpToolCallRowId } from './acp/tools';

export const turnEndingEvent = 'feed.turnEnding';

export const permissionsCancelledEvent = 'feed.permissionsCancelled';

export type TurnEndingNotice =
  | {
      kind: 'agent_crash';
      occurredAt: number;
      crashCount: number;
      description?: string;
    }
  | { kind: 'interruption' }
  | { kind: 'cancel_timeout' };

export type TurnEndingEvent =
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

export const endingFeedChanges = (
  sessionId: string,
  event: TurnEndingEvent,
): EndingFeedChange[] => {
  const { turnId } = event;

  const changes =
    event.type === turnEndingEvent
      ? [turnEndingNotice(sessionId, turnId, event.ending)]
      : event.toolCallIds.map((id) =>
          cancelledPermissionOutcome(event.acpSessionId, id),
        );

  return changes.map((change) => ({ type: 'feed.change', turnId, change }));
};
