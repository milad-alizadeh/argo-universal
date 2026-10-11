import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import {
  ProjectInfo,
  type ProjectCheckoutChoice,
  type ProjectsListOutput,
  type ProjectsBranchesInput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { listBranches, readRepository } from '@repo/git';
import type { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

function readProjectIdentity(
  database: Database,
  repository: Awaited<ReturnType<typeof readRepository>>,
): string {
  const existing = database
    .select()
    .from(project)
    .where(eq(project.path, repository.root))
    .get();
  return (
    existing?.id ??
    createHash('sha256').update(repository.commonDirectory).digest('hex')
  );
}

export async function seedProject(
  database: Database,
  path = process.env.ARGO_PROJECT_PATH ?? process.cwd(),
): Promise<void> {
  const repository = await readRepository(path);
  const metadata = { path: repository.root, name: basename(repository.root) };
  database
    .insert(project)
    .values({ id: readProjectIdentity(database, repository), ...metadata })
    .onConflictDoUpdate({ target: project.id, set: metadata })
    .run();
}

async function readDefaultCheckoutChoice(
  projectPath: string,
): Promise<ProjectCheckoutChoice> {
  const { currentBranch } = await listBranches(projectPath);
  return currentBranch === null
    ? { type: 'main' }
    : { type: 'worktree', baseBranch: currentBranch };
}

export function readProjectPath(
  database: Database,
  projectId: ProjectsBranchesInput['projectId'],
): string {
  const stored = database
    .select({ path: project.path })
    .from(project)
    .where(eq(project.id, projectId))
    .get();
  if (stored) return stored.path;
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `No Project ${projectId}`,
  });
}

async function readStoredProject(
  storedProject: typeof project.$inferSelect,
  rejections: Pick<ReturnType<typeof createRejectionCounter>, 'report'>,
): Promise<ProjectInfo> {
  const checkoutChoice =
    storedProject.checkoutChoice ??
    (await readDefaultCheckoutChoice(storedProject.path));
  const result = ProjectInfo.safeParse({ ...storedProject, checkoutChoice });
  if (!result.success) {
    rejections.report('rejected shape', result.error);
    throw result.error;
  }
  return result.data;
}

export function readProjects(
  database: Database,
  rejections: Pick<ReturnType<typeof createRejectionCounter>, 'report'>,
): Promise<ProjectsListOutput> {
  return Promise.all(
    database
      .select()
      .from(project)
      .all()
      .map((storedProject): Promise<ProjectInfo> =>
        readStoredProject(storedProject, rejections),
      ),
  );
}
