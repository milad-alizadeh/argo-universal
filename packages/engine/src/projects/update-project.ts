import type { ProjectInfo, ProjectUpdateInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { listProjectBranches } from './branches';
import { readStoredProject } from './project';

type StoredProject = typeof project.$inferSelect;

async function refuseUnknownBranch(
  database: Database,
  projectId: string,
  baseBranch: string,
): Promise<void> {
  const { branches } = await listProjectBranches(database, { projectId });

  if (branches.includes(baseBranch)) return;
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `No branch ${baseBranch}`,
  });
}

const readStored = (database: Database, projectId: string): StoredProject => {
  const stored = database
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .get();

  if (stored) return stored;
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `No Project ${projectId}`,
  });
};

const writeProject = (database: Database, updated: StoredProject): void => {
  database
    .update(project)
    .set({
      checkoutChoice: updated.checkoutChoice,
      deleteWorktreeOnArchive: updated.deleteWorktreeOnArchive,
    })
    .where(eq(project.id, updated.id))
    .run();
};

// Only what the call names changes, so a call naming nothing still answers the Project.
export async function updateProject(
  database: Database,
  rejections: Parameters<typeof readStoredProject>[1],
  { projectId, ...changes }: ProjectUpdateInput,
): Promise<ProjectInfo> {
  const updated = { ...readStored(database, projectId), ...changes };

  if (changes.checkoutChoice?.type === 'worktree')
    await refuseUnknownBranch(
      database,
      projectId,
      changes.checkoutChoice.baseBranch,
    );
  writeProject(database, updated);

  return readStoredProject(updated, rejections);
}
