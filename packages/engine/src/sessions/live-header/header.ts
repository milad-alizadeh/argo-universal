import {
  isToolCallRunning,
  type LiveHeader,
  type LiveHeaderSource,
  type PendingElicitation,
  type PendingPermission,
  type SessionUpdate,
  type ToolCallUpdate,
} from '@repo/contracts';
import { thoughtTitle } from './thought';
import { toolKindLabel } from './tool';

export interface LiveHeaderInput {
  activeTurnId: string | null;
  activeTurnStartedAt: number | null;
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
  pendingPlanProposal?: { planId: string; content: string } | null;
}

type HeaderLabel = { text: string; source: LiveHeaderSource };

export function toLiveHeader(
  session: LiveHeaderInput,
  rows: readonly SessionUpdate[],
): LiveHeader | null {
  const label = requestLabel(session) ?? turnLabel(session, rows);

  return label && { ...label, startedAt: session.activeTurnStartedAt };
}

function requestLabel(session: LiveHeaderInput): HeaderLabel | null {
  const text = requestText(session);

  return text ? { text, source: { type: 'request' } } : null;
}

function requestText(session: LiveHeaderInput): string | null {
  if (session.permissionQueue.length) return 'Awaiting approval';

  if (session.elicitationQueue.length) return 'Waiting for your answer';

  return planText(session);
}

function planText(session: LiveHeaderInput): string | null {
  return session.pendingPlanProposal ? 'Plan ready' : null;
}

function turnLabel(
  session: LiveHeaderInput,
  rows: readonly SessionUpdate[],
): HeaderLabel | null {
  if (session.activeTurnId === null) return null;

  const current = rows
    .filter((row): boolean => row.turnId === session.activeTurnId)
    .toSorted((first, second): number => first.revision - second.revision);

  return retryLabel(current.at(-1)) ?? activityLabel(current);
}

function retryLabel(latest: SessionUpdate | undefined): HeaderLabel | null {
  const retry = retryOf(latest);

  return retry
    ? {
        text: `Retrying (${retry.attempt} of ${retry.maxAttempts})`,
        source: { type: 'retry' },
      }
    : null;
}

function activityLabel(current: readonly SessionUpdate[]): HeaderLabel {
  const title = thoughtTitle(current);

  return title
    ? { text: title, source: { type: 'thought' } }
    : toolLabel(current);
}

function toolLabel(current: readonly SessionUpdate[]): HeaderLabel {
  const tool = current
    .filter(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' && isToolCallRunning(row),
    )
    .toSorted((first, second): number => first.position - second.position)
    .at(-1);

  const text = tool && toolText(tool);

  return text
    ? { text, source: { type: 'tool_call', toolCallId: tool.toolCallId } }
    : { text: 'Working', source: { type: 'working' } };
}

function toolText(tool: ToolCallUpdate): string | undefined | null {
  const description = toolDescription(tool);

  return description?.trim() || fallbackToolText(tool);
}

function fallbackToolText(tool: ToolCallUpdate): string | undefined | null {
  return toolKindLabel(tool) || toolName(tool);
}

function retryOf(
  latest: SessionUpdate | undefined,
): ReturnType<typeof noticeRetry> {
  return latest?.sessionUpdate === 'notice' ? noticeRetry(latest) : undefined;
}

function noticeRetry(
  notice: Extract<SessionUpdate, { sessionUpdate: 'notice' }>,
): NonNullable<
  NonNullable<
    Extract<SessionUpdate, { sessionUpdate: 'notice' }>['_meta']
  >['argo']
>['retry'] {
  return notice._meta?.argo?.retry;
}

function toolDescription(tool: ToolCallUpdate): string | undefined {
  return tool._meta?.argo?.description;
}

function toolName(tool: ToolCallUpdate): string | undefined {
  return tool.title.trim() || tool.name?.trim();
}
