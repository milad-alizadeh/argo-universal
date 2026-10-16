import type { FeedChange, PendingPermission } from '@repo/contracts';
import { acpToolCallRowId } from './acp/tools';

export const turnEndingEvent = 'feed.turnEnding';

export const permissionsCancelledEvent = 'feed.permissionsCancelled';

export const permissionSelectedEvent = 'feed.permissionSelected';

export type TurnEndingNotice =
  | {
      kind: 'agent_crash';
      occurredAt: number;
      title: string;
      description?: string;
    }
  | { kind: 'interruption' };

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

type PermissionOption = PendingPermission['options'][number];

export type PermissionSelectedEvent = {
  type: typeof permissionSelectedEvent;
  turnId: string | null;
  acpSessionId: string;
  toolCallId: string;
  option: PermissionOption;
};

type NoticeFields = { id: string; title: string; description?: string };

export const interruptionDisclosureId = (turnId: string): string =>
  `${turnId}:interrupted`;

const crashNotice = (
  sessionId: string,
  ending: Extract<TurnEndingNotice, { kind: 'agent_crash' }>,
): NoticeFields => {
  const fields: NoticeFields = {
    id: `${sessionId}:crash:${ending.occurredAt}:${ending.title}`,
    title: ending.title,
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

  return interruptionNotice(turnId);
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

type PermissionOutcome =
  | { outcome: 'cancelled' }
  | ({ outcome: 'selected' } & PermissionOption);

// Permission outcomes use the ACP-scoped Tool call identity.
const permissionOutcomeChange = (
  acpSessionId: string,
  toolCallId: string,
  permissionOutcome: PermissionOutcome,
): FeedChange => ({
  type: 'patch',
  id: acpToolCallRowId(acpSessionId, toolCallId),
  set: { _meta: { argo: { permissionOutcome } } },
});

export const cancelledPermissionOutcome = (
  acpSessionId: string,
  toolCallId: string,
): FeedChange =>
  permissionOutcomeChange(acpSessionId, toolCallId, { outcome: 'cancelled' });

export const selectedPermissionOutcome = (
  event: PermissionSelectedEvent,
): FeedChange =>
  permissionOutcomeChange(event.acpSessionId, event.toolCallId, {
    outcome: 'selected',
    ...event.option,
  });

export const endingFeedChanges = (
  sessionId: string,
  event: TurnEndingEvent,
): FeedChange[] =>
  event.type === turnEndingEvent
    ? [turnEndingNotice(sessionId, event.turnId, event.ending)]
    : event.toolCallIds.map((id) =>
        cancelledPermissionOutcome(event.acpSessionId, id),
      );
