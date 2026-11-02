import { rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { ProjectAdded } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { cloneRepository, initRepository } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { isFolder, seedProject } from './project';

const badRequest = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

// Where cloned and new Projects go: the owner's choice, or an Argo folder in their home.
const projectsFolder = (): string =>
  process.env.ARGO_PROJECTS_DIR ?? join(homedir(), 'Argo');

const notARepository = /not a git repository/i;

// A folder outside any repository is the caller's mistake; any other failure is the Server's.
export async function addProject(
  database: Database,
  path: string,
): Promise<ProjectAdded> {
  if (!(await isFolder(path))) throw badRequest(`No folder ${path}`);

  return seedProject(database, path)
    .then((projectId): ProjectAdded => ({ projectId }))
    .catch((error: Error): never => {
      if (notARepository.test(error.message))
        throw badRequest(`${path} is not in a git repository`);

      throw error;
    });
}

const folderName = /^\w[\w.-]*$/;

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    (): boolean => true,
    (): boolean => false,
  );

async function freeFolder(name: string): Promise<string> {
  if (!folderName.test(name)) throw badRequest(`${name} is not a folder name`);

  const folder = join(projectsFolder(), name);

  if (await exists(folder)) throw badRequest(`${folder} already exists`);

  return folder;
}

// A remote is cloned under the name its URL ends in, and may not be read as an option.
function cloneName(url: string): string {
  if (url.startsWith('-')) throw badRequest(`${url} is not a repository URL`);

  return basename(url.split(/[/:]/).findLast(Boolean) ?? '', '.git');
}

// A folder made for a Project that did not register is removed, so trying again does not meet it.
async function registered(
  database: Database,
  folder: string,
  made: Promise<void>,
): Promise<ProjectAdded> {
  try {
    await made;

    return { projectId: await seedProject(database, folder) };
  } catch (error) {
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
}

export async function cloneProject(
  database: Database,
  url: string,
): Promise<ProjectAdded> {
  const folder = await freeFolder(cloneName(url));

  return registered(
    database,
    folder,
    cloneRepository(url, folder).catch((error: Error): never => {
      throw badRequest(`Could not clone ${url}: ${error.message}`);
    }),
  );
}

export async function createProject(
  database: Database,
  name: string,
): Promise<ProjectAdded> {
  const folder = await freeFolder(name);

  return registered(database, folder, initRepository(folder));
}
