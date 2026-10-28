import type { ProjectsListOutput } from '@repo/contracts';
import {
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import type { OperationImplementations, OperationResult } from './operations';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import { resolveReadTarget, type ResolvedReadOperation } from './read-target';
import { runOperation } from './router.gen';
import type { OperationCaller, SessionCaller } from './session-tokens';

const unavailable = 'Session access to this Operation is not available';

type SessionAccess = {
  implementations: OperationImplementations;
  caller: SessionCaller;
  deps: Pick<OperationsDeps, 'readSession'>;
};

export function scopedOperations(
  caller: OperationCaller,
  rows: OperationRow[],
): OperationRow[] {
  if (caller.kind === 'user') return rows;

  return rows.map((row) =>
    row.tier === 'read'
      ? row
      : { ...row, enabled: false, disabledReason: unavailable },
  );
}

export async function runSessionOperation(
  { implementations, caller, deps }: SessionAccess,
  operation: { id: OperationId; params: Json },
): Promise<OperationResult> {
  const read = resolveReadTarget(deps, caller, operation);

  if (!read) throw new TRPCError({ code: 'FORBIDDEN', message: unavailable });

  requireReadScope(caller, read);

  return runSessionRead(implementations, caller, read);
}

function requireReadScope(
  caller: SessionCaller,
  read: ResolvedReadOperation,
): void {
  if (read.target.projectId === null) return;

  if (read.target.projectId !== caller.projectId)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This Operation is outside the calling Session’s Project',
    });
}

// Runs a read after scope was authorized; Permission policy can authorize a foreign target later.
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
