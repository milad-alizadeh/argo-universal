import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { Database } from '@repo/db';
import { cloneRepository, initRepository } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { isFolder, seedProject } from './project';

const badRequest = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

// Where cloned and new Projects go: the owner's choice, or an Argo folder in their home.
const projectsFolder = (): string =>
  process.env.ARGO_PROJECTS_DIR ?? join(homedir(), 'Argo');

// A folder that is not in a git repository is the caller's mistake, not the Server's.
export async function addProject(
  database: Database,
  path: string,
): Promise<{ projectId: string }> {
  if (!(await isFolder(path))) throw badRequest(`No folder ${path}`);

  try {
    return { projectId: await seedProject(database, path) };
  } catch {
    throw badRequest(`${path} is not in a git repository`);
  }
}

const folderName = /^\w[\w.-]*$/;

function freeFolder(name: string): string {
  if (!folderName.test(name)) throw badRequest(`${name} is not a folder name`);

  const folder = join(projectsFolder(), name);

  if (existsSync(folder)) throw badRequest(`${folder} already exists`);

  return folder;
}

// A remote is cloned under the name its URL ends in, and may not be read as an option.
function cloneName(url: string): string {
  if (url.startsWith('-')) throw badRequest(`${url} is not a repository URL`);

  return basename(url.split(/[/:]/).findLast(Boolean) ?? '', '.git');
}

export async function cloneProject(
  database: Database,
  url: string,
): Promise<{ projectId: string }> {
  const folder = freeFolder(cloneName(url));

  await cloneRepository(url, folder).catch((): never => {
    throw badRequest(`Could not clone ${url}`);
  });

  return { projectId: await seedProject(database, folder) };
}

export async function createProject(
  database: Database,
  name: string,
): Promise<{ projectId: string }> {
  const folder = freeFolder(name);

  await initRepository(folder);

  return { projectId: await seedProject(database, folder) };
}
