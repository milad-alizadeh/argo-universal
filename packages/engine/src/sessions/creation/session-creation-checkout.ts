import type { SessionNewInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../../projects';

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
  database: Database,
  newSession: Pick<SessionNewInput, 'projectId' | 'checkout'>,
): Promise<string> {
  const projectPath = readProjectPath(database, newSession.projectId);

  if (newSession.checkout.type === 'worktree')
    await requireBranch(projectPath, newSession.checkout.baseBranch);

  return projectPath;
}

// A borrowed Checkout needs a Session to borrow from: the App and the user token start none.
export function requireStarter(
  newSession: Pick<SessionNewInput, 'checkout'>,
  startedBySessionId: string | null,
): void {
  if (newSession.checkout.type === 'starter' && startedBySessionId === null)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Only a Session can start a Session in its starter's Checkout",
    });
}
