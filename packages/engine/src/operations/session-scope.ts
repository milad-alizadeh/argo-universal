import {
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { SessionOperationCall } from '../sessions';
import type { OperationResult, SessionInvoke } from './implementations';
import type { OperationsDeps } from './operations';
import { resolveReadTarget, type ResolvedReadOperation } from './read-target';
import type { SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';
import { runSessionWrite } from './session-write';

const needsTurn = 'A Permission request requires an active Turn';

type SessionAccess = {
  invoke: SessionInvoke;
  caller: SessionCaller;
  deps: OperationsDeps;
  call: SessionOperationCall;
  starts: SessionStarts;
};

export function scopedOperations(
  rows: OperationRow[],
  call?: SessionOperationCall,
): OperationRow[] {
  if (!call) return rows;

  if (call.canConfirm) return rows;

  return rows.map((row) =>
    row.tier === 'confirm'
      ? { ...row, enabled: false, disabledReason: needsTurn }
      : row,
  );
}

export async function runSessionOperation(
  { invoke, caller, deps, call, starts }: SessionAccess,
  operation: { id: OperationId; params: Json },
): Promise<OperationResult> {
  const read = resolveReadTarget(deps, caller, operation);

  if (!read)
    return runSessionWrite(deps, invoke, {
      caller,
      operation,
      call,
      starts,
    });

  await confirmReadScope({ caller, call }, read);

  return runSessionRead(invoke, caller, read);
}

async function confirmReadScope(
  { caller, call }: Pick<SessionAccess, 'caller' | 'call'>,
  read: ResolvedReadOperation,
): Promise<void> {
  if (read.target.projectId === null) return;

  if (read.target.projectId === caller.projectId) return;

  await call.confirm(operations[read.id].description);
}

// Executes an authorized read while preserving its Project scope metadata.
async function runSessionRead(
  invoke: SessionInvoke,
  caller: SessionCaller,
  { id, params }: ResolvedReadOperation,
): Promise<OperationResult> {
  if (id !== 'project.list') return invoke({ id, params });

  const projects = await invoke({ id, params });

  return projects.map((project) => ({
    ...project,
    inScope: project.id === caller.projectId,
  }));
}
