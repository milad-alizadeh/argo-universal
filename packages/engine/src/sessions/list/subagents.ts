import type {
  SessionRecord,
  Subagent,
  SubagentUpdate,
  Turn,
} from '@repo/contracts';
import { latestTurnOf } from './session-info';

type ChildSession = Pick<SessionRecord, 'id' | 'parentSessionId' | 'title'>;

export function toSubagents(
  children: readonly ChildSession[],
  turns: readonly Turn[],
  updates: readonly SubagentUpdate[],
): Subagent[] {
  return children.flatMap((child): Subagent[] => {
    if (child.parentSessionId === null) return [];
    const latest = latestTurnOf(turns, child.id);

    const state = updates
      .filter((update): boolean => update.subagentSessionId === child.id)
      .toSorted((first, second): number => second.position - first.position)
      .find(
        (update): boolean => update.subagentState !== undefined,
      )?.subagentState;

    return [
      {
        sessionId: child.id,
        parentSessionId: child.parentSessionId,
        toolCallId: null,
        title: child.title,
        role: null,
        model: latest?.model ?? null,
        state: state ?? (latest?.status === 'running' ? 'running' : 'idle'),
        stopReason: latest?.stopReason ?? null,
        startedAt: latest?.startedAt ?? null,
        endedAt: latest?.endedAt ?? null,
        durationMs:
          latest?.endedAt === null || latest === undefined
            ? null
            : latest.endedAt - latest.startedAt,
        tokens: latest?.usage?.totalTokens ?? null,
      },
    ];
  });
}
