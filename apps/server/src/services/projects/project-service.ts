import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { ProjectsService } from '@repo/api';
import { ProjectInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const run = promisify(execFile);
const gitLine = z.string().trim().min(1);
let rejectedShapes = 0;
const checked = <Value>(read: () => Value): Value => {
  try {
    return read();
  } catch (error) {
    rejectedShapes += 1;
    console.error(`projects: rejected shape #${rejectedShapes}`, error);
    throw error;
  }
};
const git = async (path: string, ...arguments_: string[]) => {
  const { stdout } = await run('git', ['-C', path, ...arguments_]);
  return checked(() => gitLine.parse(stdout));
};

export async function seedProject(
  database: Database,
  path = process.env.ARGO_PROJECT_PATH ?? process.cwd(),
) {
  const directory = await realpath(path);
  const commonDirectory = await realpath(
    resolve(directory, await git(directory, 'rev-parse', '--git-common-dir')),
  );
  const root = await git(directory, 'rev-parse', '--show-toplevel');
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
const defaultCheckoutChoice = async (path: string) => {
  const { currentBranch } = await listBranches(path);
  return currentBranch === null
    ? { type: 'main' as const }
    : { type: 'worktree' as const, baseBranch: currentBranch };
};

export function createProjectService(database: Database): ProjectsService {
  return {
    branches: async ({ projectId }) => {
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
      return listBranches(stored.path);
    },
    list: async () =>
      Promise.all(
        database
          .select()
          .from(project)
          .all()
          .map(async (row) => {
            const checkoutChoice =
              row.checkoutChoice ?? (await defaultCheckoutChoice(row.path));
            return checked(() => ProjectInfo.parse({ ...row, checkoutChoice }));
          }),
      ),
  };
}
