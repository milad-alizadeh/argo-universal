import type {
  SessionRecord,
  Subagent,
  SubagentUpdate,
  Turn,
} from '@repo/contracts';

type ChildSession = Pick<SessionRecord, 'id' | 'parentSessionId' | 'title'>;

// A child Session with its latest Turn; a Started Session is no Subagent, so it is listed under its starter and never here.
export function toSubagent(
  child: ChildSession,
  latest: Turn | undefined,
  updates: readonly SubagentUpdate[],
): Subagent[] {
  const parentId = child.parentSessionId;

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

const declaredRoleOf = (update: SubagentUpdate): string | undefined =>
  update._meta?.argo?.declaredRole;

// The role the Session declared at the spawn outranks the latest one the Agent reports.
function updateRole(
  id: string,
  updates: readonly SubagentUpdate[],
): string | null {
  const own = updates
    .filter((update) => update.subagentSessionId === id)
    .toSorted((first, second) => second.position - first.position);

  return (
    own.map(declaredRoleOf).find((role) => role !== undefined) ??
    own.map(roleOf).find((role) => role !== undefined) ??
    null
  );
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
  'sessionId' | 'parentSessionId' | 'toolCallId' | 'title' | 'role'
>;

function childIdentity(
  child: ChildSession,
  parentSessionId: string,
  updates: readonly SubagentUpdate[],
): ChildIdentity {
  return {
    sessionId: child.id,
    parentSessionId,
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
