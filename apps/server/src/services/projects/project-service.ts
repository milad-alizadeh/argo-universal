import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { ProjectsService } from '@repo/api';
import { ProjectInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { listBranches, readRepository } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

export async function seedProject(
  database: Database,
  path = process.env.ARGO_PROJECT_PATH ?? process.cwd(),
): Promise<void> {
  const { root, commonDirectory } = await readRepository(path);
  const existing = database
    .select()
    .from(project)
    .where(eq(project.path, root))
    .get();
  const id =
    existing?.id ?? createHash('sha256').update(commonDirectory).digest('hex');
  database
    .insert(project)
    .values({ id, path: root, name: basename(root) })
    .onConflictDoUpdate({
      target: project.id,
      set: { path: root, name: basename(root) },
    })
    .run();
}

// Until a Session stores a choice, a worktree from the current branch, or the main checkout on a detached HEAD.
const defaultCheckoutChoice = async (
  path: string,
): Promise<
  | { type: 'main'; baseBranch?: undefined }
  | { type: 'worktree'; baseBranch: string }
> => {
  const { currentBranch } = await listBranches(path);
  return currentBranch === null
    ? { type: 'main' as const }
    : { type: 'worktree' as const, baseBranch: currentBranch };
};

// The Project's path, or NOT_FOUND for an unknown Project.
export function readProjectPath(database: Database, projectId: string): string {
  const stored = database
    .select({ path: project.path })
    .from(project)
    .where(eq(project.id, projectId))
    .get();
  if (!stored)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No Project ${projectId}`,
    });
  return stored.path;
}

export function createProjectService(database: Database): ProjectsService {
  let rejectedProjects = 0;
  return {
    branches: async ({
      projectId,
    }): Promise<{ branches: string[]; currentBranch: string | null }> =>
      listBranches(readProjectPath(database, projectId)),
    list: async (): Promise<ProjectInfo[]> =>
      Promise.all(
        database
          .select()
          .from(project)
          .all()
          .map(async (row): Promise<ProjectInfo> => {
            const checkoutChoice =
              row.checkoutChoice ?? (await defaultCheckoutChoice(row.path));
            const result = ProjectInfo.safeParse({ ...row, checkoutChoice });
            if (!result.success) {
              rejectedProjects += 1;
              console.error(
                `projects: rejected shape #${rejectedProjects}`,
                result.error,
              );
              throw result.error;
            }
            return result.data;
          }),
      ),
  };
}
