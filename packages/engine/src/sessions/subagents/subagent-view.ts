import type {
  SessionRecord,
  Subagent,
  SubagentUpdate,
  Turn,
} from '@repo/contracts';

type ChildSession = Pick<
  SessionRecord,
  'id' | 'parentSessionId' | 'startedBySessionId' | 'title'
>;

// A child Session with its latest Turn; a Session without a parent is no Subagent.
export function toSubagent(
  child: ChildSession,
  latest: Turn | undefined,
  updates: readonly SubagentUpdate[],
): Subagent[] {
  const parentId = child.parentSessionId ?? child.startedBySessionId;

  if (parentId === null) return [];

  return [
    {
      ...childIdentity(child, parentId, updates),
      ...turnDetails(latest),
      state: subagentState(latest, updateState(child.id, updates)),
    },
  ];
}

function updateState(
  id: string,
  updates: readonly SubagentUpdate[],
): SubagentUpdate['subagentState'] {
  return updates
    .filter((update): boolean => update.subagentSessionId === id)
    .toSorted((first, second): number => second.position - first.position)
    .find((update): boolean => update.subagentState !== undefined)
    ?.subagentState;
}

const roleOf = (update: SubagentUpdate): string | undefined =>
  update._meta?.argo?.role;

function updateRole(
  id: string,
  updates: readonly SubagentUpdate[],
): string | null {
  const roles = updates
    .filter((update) => update.subagentSessionId === id)
    .toSorted((first, second) => second.position - first.position)
    .map(roleOf);

  return roles.find((role) => role !== undefined) ?? null;
}

type TurnDetails = Pick<
  Subagent,
  'model' | 'stopReason' | 'startedAt' | 'endedAt' | 'durationMs' | 'tokens'
>;

function turnDetails(latest: Turn | undefined): TurnDetails {
  return latest
    ? knownTurnDetails(latest)
    : {
        model: null,
        stopReason: null,
        startedAt: null,
        endedAt: null,
        durationMs: null,
        tokens: null,
      };
}

function knownTurnDetails(latest: Turn): ReturnType<typeof turnDetails> {
  return {
    model: latest.model,
    stopReason: latest.stopReason,
    startedAt: latest.startedAt,
    endedAt: latest.endedAt,
    durationMs: durationMs(latest),
    tokens: latest.usage?.totalTokens ?? null,
  };
}

type ChildIdentity = Pick<
  Subagent,
  'sessionId' | 'parentSessionId' | 'readOnly' | 'toolCallId' | 'title' | 'role'
>;

function childIdentity(
  child: ChildSession,
  parentSessionId: string,
  updates: readonly SubagentUpdate[],
): ChildIdentity {
  return {
    sessionId: child.id,
    parentSessionId,
    readOnly: child.parentSessionId !== null,
    toolCallId: null,
    title: child.title,
    role: updateRole(child.id, updates),
  };
}

function subagentState(
  latest: Turn | undefined,
  state: SubagentUpdate['subagentState'],
): Subagent['state'] {
  if (interruptedChild(latest)) return 'idle';

  return state ?? childTurnState(latest);
}

const interruptedChild = (latest: Turn | undefined): boolean =>
  latest?.error?.code === 'interrupted';

const childTurnState = (latest: Turn | undefined): Subagent['state'] =>
  latest?.status === 'running' ? 'running' : 'idle';

function durationMs(latest: Turn): number | null {
  return latest.endedAt === null ? null : latest.endedAt - latest.startedAt;
}
