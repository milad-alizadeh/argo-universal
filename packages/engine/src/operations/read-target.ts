import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionCaller } from './session-tokens';

export type ReadOperationId = {
  [Id in OperationId]: (typeof operations)[Id]['tier'] extends 'read'
    ? Id
    : never;
}[OperationId];

export interface ResolvedReadOperation {
  id: ReadOperationId;
  params: Json;
  target: { projectId: string | null; sessionId: string | null };
}

type TargetContext = {
  deps: Pick<OperationsDeps, 'readSession'>;
  caller: Pick<SessionCaller, 'projectId'>;
  params: Json;
};

type ResolveTarget = (context: TargetContext) => ResolvedReadOperation;

type SessionReadId = Exclude<
  Extract<ReadOperationId, `session.${string}`>,
  'session.list'
>;

const isReadOperation = (id: OperationId): id is ReadOperationId =>
  operations[id].tier === 'read';

const globalTarget =
  (id: ReadOperationId): ResolveTarget =>
  ({ params }) => ({
    id,
    params,
    target: { projectId: null, sessionId: null },
  });

const sessionTarget =
  (id: SessionReadId): ResolveTarget =>
  ({ deps, params }) => {
    const { sessionId } = operationParams(operations[id].params, params);
    const { projectId } = deps.readSession(sessionId);

    return { id, params, target: { projectId, sessionId } };
  };

function listTarget({ caller, params }: TargetContext): ResolvedReadOperation {
  const input = operationParams(operations['session.list'].params, params);
  const projectId = input.projectId ?? caller.projectId;

  return {
    id: 'session.list',
    params: { ...input, projectId },
    target: { projectId, sessionId: null },
  };
}

function branchesTarget({ params }: TargetContext): ResolvedReadOperation {
  const id = 'project.listBranches';
  const { projectId } = operationParams(operations[id].params, params);

  return { id, params, target: { projectId, sessionId: null } };
}

// Every read must choose its target explicitly when it enters the registry.
const readTargets = {
  'session.list': listTarget,
  'session.get': sessionTarget('session.get'),
  'session.feed': sessionTarget('session.feed'),
  'session.changes': sessionTarget('session.changes'),
  'session.diff': sessionTarget('session.diff'),
  'session.listAgents': sessionTarget('session.listAgents'),
  'session.listShells': sessionTarget('session.listShells'),
  'session.listBranches': sessionTarget('session.listBranches'),
  'project.listBranches': branchesTarget,
  'project.list': globalTarget('project.list'),
  'registry.get': globalTarget('registry.get'),
  'agent.list': globalTarget('agent.list'),
  'plugin.list': globalTarget('plugin.list'),
  'plugin.getSettings': globalTarget('plugin.getSettings'),
} satisfies Record<ReadOperationId, ResolveTarget>;

// Resolves read authority without deciding whether a foreign Project may be read.
export function resolveReadTarget(
  deps: TargetContext['deps'],
  caller: TargetContext['caller'],
  { id, params }: { id: OperationId; params: Json },
): ResolvedReadOperation | undefined {
  if (!isReadOperation(id)) return undefined;

  return readTargets[id]({ deps, caller, params });
}
