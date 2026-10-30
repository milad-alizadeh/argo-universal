import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import {
  ProjectInfo,
  type ProjectCheckoutChoice,
  type ProjectsListOutput,
  type ProjectsBranchesInput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import {
  listBranches,
  readOriginHost,
  readRepository,
  type Repository,
} from '@repo/git';
import type { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { notifyProjectChanges } from './changes';

// One git common directory is one Project, whichever of its checkouts registered it.
function readProjectIdentity(
  database: Database,
  repository: Repository,
): string {
  const existing = database
    .select()
    .from(project)
    .where(eq(project.path, repository.mainCheckout))
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
  const { mainCheckout } = repository;
  const metadata = { path: mainCheckout, name: basename(mainCheckout) };
  database
    .insert(project)
    .values({ id: readProjectIdentity(database, repository), ...metadata })
    .onConflictDoUpdate({ target: project.id, set: metadata })
    .run();
  notifyProjectChanges(database);
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

const hostNames = new Map([
  ['github.com', 'GitHub'],
  ['gitlab.com', 'GitLab'],
  ['bitbucket.org', 'Bitbucket'],
]);

// A failed remote read leaves this Project without one rather than failing the list.
const readRemoteHost = (projectPath: string): Promise<string | null> =>
  readOriginHost(projectPath).then(
    (host): string | null =>
      host === null ? null : (hostNames.get(host) ?? host),
    (): null => null,
  );

const isFolder = (path: string): Promise<boolean> =>
  stat(path).then(
    (found): boolean => found.isDirectory(),
    (): boolean => false,
  );

type Rejections = Pick<ReturnType<typeof createRejectionCounter>, 'report'>;

type StoredProject = typeof project.$inferSelect;

// The stored choice stays unchecked until the Project's shape is parsed.
type ProjectDetail = Pick<ProjectInfo, 'remoteHost' | 'folderExists'> & {
  checkoutChoice: NonNullable<StoredProject['checkoutChoice']>;
};

// A Project whose folder is gone keeps its stored choice and reads nothing from Git.
const missingFolderDetail = (
  checkoutChoice: StoredProject['checkoutChoice'],
): ProjectDetail => ({
  checkoutChoice: checkoutChoice ?? { type: 'main' },
  remoteHost: null,
  folderExists: false,
});

async function readProjectDetail({
  path,
  checkoutChoice,
}: StoredProject): Promise<ProjectDetail> {
  if (!(await isFolder(path))) return missingFolderDetail(checkoutChoice);

  const [choice, remoteHost] = await Promise.all([
    Promise.resolve(checkoutChoice ?? readDefaultCheckoutChoice(path)),
    readRemoteHost(path),
  ]);

  return { checkoutChoice: choice, remoteHost, folderExists: true };
}

async function readStoredProject(
  storedProject: StoredProject,
  rejections: Rejections,
): Promise<ProjectInfo> {
  const detail = await readProjectDetail(storedProject);
  const result = ProjectInfo.safeParse({ ...storedProject, ...detail });

  if (!result.success) {
    rejections.report('rejected shape', result.error);
    throw result.error;
  }

  return result.data;
}

export function readProjects(
  database: Database,
  rejections: Rejections,
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

// Every registered Project's folder: what any Plugin may read (ADR-0030).
export const readProjectPaths = (database: Database): string[] =>
  database
    .select({ path: project.path })
    .from(project)
    .all()
    .map(({ path }) => path);
