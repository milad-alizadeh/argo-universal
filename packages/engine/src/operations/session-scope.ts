import type { ProjectsListOutput } from '@repo/contracts';
import {
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import type { OperationImplementations, OperationResult } from './operations';
import { operationParams } from './params';
import type { OperationCaller, SessionCaller } from './session-tokens';

const unavailable = 'Session access to this Operation is not available';

export function scopedOperations(
  caller: OperationCaller,
  rows: OperationRow[],
): OperationRow[] {
  if (caller.kind === 'user') return rows;

  return rows.map((row) =>
    row.id === 'project.list'
      ? row
      : { ...row, enabled: false, disabledReason: unavailable },
  );
}

export async function runSessionOperation(
  implementations: OperationImplementations,
  caller: SessionCaller,
  { id, params }: { id: OperationId; params: Json },
): Promise<OperationResult> {
  if (id !== 'project.list')
    throw new TRPCError({ code: 'FORBIDDEN', message: unavailable });

  const projects = await implementations['project.list'](
    operationParams(operations['project.list'].params, params),
  );

  return projectScope(caller, projects);
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
