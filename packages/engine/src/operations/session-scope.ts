import type { ProjectsListOutput } from '@repo/contracts';
import {
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { SessionOperationCall } from '../sessions';
import type { OperationImplementations, OperationResult } from './operations';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import { resolveReadTarget, type ResolvedReadOperation } from './read-target';
import { runOperation } from './router.gen';
import type { SessionCaller } from './session-tokens';
import { runSessionWrite } from './session-write';

const needsTurn = 'A Permission request requires an active Turn';

type SessionAccess = {
  implementations: OperationImplementations;
  caller: SessionCaller;
  deps: Pick<OperationsDeps, 'readSession'>;
  call: SessionOperationCall;
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
  { implementations, caller, deps, call }: SessionAccess,
  operation: { id: OperationId; params: Json },
): Promise<OperationResult> {
  const read = resolveReadTarget(deps, caller, operation);

  if (!read)
    return runSessionWrite(deps, implementations, { caller, operation, call });

  await confirmReadScope({ caller, call }, read);

  return runSessionRead(implementations, caller, read);
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
export async function runSessionRead(
  implementations: OperationImplementations,
  caller: SessionCaller,
  { id, params }: ResolvedReadOperation,
): Promise<OperationResult> {
  if (id === 'project.list') {
    const projects = await implementations[id](
      operationParams(operations[id].params, params),
    );

    return projectScope(caller, projects);
  }

  return operations[id].result.parseAsync(
    await runOperation(implementations, id, params),
  );
}

function projectScope(
  caller: SessionCaller,
  projects: ProjectsListOutput,
): Promise<OperationResult<'project.list'>> {
  return operations['project.list'].result.parseAsync(
    projects.map((project) => ({
      ...project,
      inScope: project.id === caller.projectId,
    })),
  );
}
