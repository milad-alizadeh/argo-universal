import type { SessionNewInput } from '@repo/contracts';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../../projects';
import type { SessionRouterDeps } from '../router-deps';

async function requireBranch(
  projectPath: string,
  branch: string,
): Promise<void> {
  if (!(await listBranches(projectPath)).branches.includes(branch))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `No local branch ${branch}`,
    });
}

export async function requireCheckoutProjectPath(
  database: SessionRouterDeps['database'],
  newSession: Pick<SessionNewInput, 'projectId' | 'checkout'>,
): Promise<string> {
  const projectPath = readProjectPath(database, newSession.projectId);

  if (newSession.checkout.type === 'worktree')
    await requireBranch(projectPath, newSession.checkout.baseBranch);

  return projectPath;
}
