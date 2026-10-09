import type {
  AgentMessage,
  TextContent,
  LiveHeader,
  PendingPermission,
  PlanUpdate,
  SessionRecord,
  SessionUpdate,
  Turn,
} from '@repo/contracts';
import { type LiveHeaderInput, toLiveHeader } from './live-header';
import type { SessionListState } from './session-list-machine';
import { toSessionCheckout } from './session-record';
import { deriveSessionStatus } from './session-status';

export interface SessionInfoInput {
  row: SessionRecord;
  turns: readonly Turn[];
  message: AgentMessage | undefined;
  plan: PlanUpdate | undefined;
  live: (LiveHeaderInput & { failure: string | null }) | null;
  feed: { maxRevision: number; activityAt: number } | null;
  liveHeaderRows: readonly SessionUpdate[];
  children: readonly SessionRecord[];
}

export function toSessionInfo(
  input: SessionInfoInput,
): SessionListState[number] {
  const { row, live } = input;
  const latestTurn = latestTurnOf(input.turns, row.id);
  const running = live
    ? live.activeTurnId !== null
    : latestTurn?.status === 'running';
  const needsInput = Boolean(
    live?.permissionQueue[0] || live?.pendingElicitation,
  );
  const header = toLiveHeader(
    {
      activeTurnId:
        live?.activeTurnId ?? (running ? (latestTurn?.id ?? null) : null),
      activeTurnStartedAt:
        live?.activeTurnStartedAt ??
        (running ? (latestTurn?.startedAt ?? null) : null),
      permissionQueue: live?.permissionQueue ?? [],
      pendingElicitation: live?.pendingElicitation ?? null,
    },
    input.liveHeaderRows,
  );
  return {
    information: {
      sessionId: row.id,
      projectId: row.projectId,
      agent: row.agent,
      parentSessionId: row.parentSessionId,
      cwd: row.checkoutPath,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: row.title,
      titleSource: row.titleSource,
      status: deriveSessionStatus({
        needsInput,
        running,
        failure: live?.failure ?? row.failure,
        latestTurnFailed: latestTurn?.stopReason === 'error',
        latestTurnInterrupted: latestTurn?.error?.code === 'interrupted',
        maxRevision: Math.max(row.maxRevision, input.feed?.maxRevision ?? 0),
        seenRevision: row.seenRevision,
      }),
      activity: activityOf({
        needsInput,
        running,
        header,
        permission: live?.permissionQueue[0],
        message: input.message,
      }),
      activityAt:
        input.feed && input.feed.maxRevision > row.maxRevision
          ? input.feed.activityAt
          : row.activityAt,
      checkout: toSessionCheckout(row),
      plan:
        input.plan?.plan.type === 'items'
          ? {
              done: input.plan.plan.entries.filter(
                (entry): boolean => entry.status === 'completed',
              ).length,
              total: input.plan.plan.entries.length,
            }
          : null,
      subagents: {
        total: input.children.length,
        running: input.children.filter((child): boolean =>
          input.turns.some(
            (turn): boolean =>
              turn.sessionId === child.id && turn.status === 'running',
          ),
        ).length,
      },
      shells: { total: 0, running: 0 },
      archivedAt: row.archivedAt,
      issue: null,
      pullRequest: null,
    },
    running,
  };
}

export function latestTurnOf(
  turns: readonly Turn[],
  sessionId: string,
): Turn | undefined {
  return turns
    .filter((turn): boolean => turn.sessionId === sessionId)
    .toSorted(
      (first, second): number =>
        second.startedAt - first.startedAt || second.id.localeCompare(first.id),
    )[0];
}

function activityOf(input: {
  needsInput: boolean;
  running: boolean;
  header: LiveHeader | null;
  permission: PendingPermission | undefined;
  message: AgentMessage | undefined;
}): string {
  if (input.needsInput)
    return input.permission?.title ?? 'Waiting for your answer';
  if (input.running) return input.header?.text ?? 'Working';
  return (
    input.message?.content
      .filter((block): block is TextContent => block.type === 'text')
      .map((block): string => block.text)
      .join('\n')
      .split('\n')[0] ?? ''
  );
}
