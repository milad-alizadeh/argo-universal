import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem } from './pull-change';
import { readLinks, type ChangesSource, type LinkRead } from './pull-changes';
import { fetchPull } from './pull-reads';
import { parseReference } from './pull-reference';

type ProjectInfo = Awaited<ReturnType<Argo['projects']['list']>>[number];

type Caller = { projectId: string; sessionId: string };

type Scope = Pick<Argo, 'projects' | 'sessions' | 'fetch' | 'changed'> &
  Pick<ChangesSource, 'store'>;

async function projectOf(
  { projects }: Scope,
  projectId: string,
): Promise<ProjectInfo> {
  const project = (await projects.list()).find(({ id }) => id === projectId);

  if (!project) throw new Error('This Project no longer exists.');

  return project;
}

/*
 * The Project's origin, once the caller's Project exists and the Session belongs to it: an Operation never acts on a
 * Session outside the Project core resolved for the run.
 */
async function originOf(
  scope: Scope,
  { projectId, sessionId }: Caller,
): Promise<string | null> {
  const project = await projectOf(scope, projectId);
  const session = await scope.sessions.get(sessionId);

  if (session?.projectId !== projectId)
    throw new Error('This Session does not belong to this Project.');

  return project.originUrl;
}

export type Attached = ReturnType<typeof changeOf>;

/*
 * Associates the calling Session with the pull request a reference names. GitHub is asked first, so a pull request
 * that does not exist, or that the Project's Account cannot see, is refused and nothing is stored. The association
 * is kept under the repository GitHub reports, so a renamed or differently cased reference is the same one.
 */
export async function attach(
  scope: Scope,
  reference: string,
  caller: Caller,
): Promise<Attached> {
  const named = parseReference(reference, await originOf(scope, caller));
  const pull = await fetchPull(scope.fetch, { ...named, ...caller });

  await scope.store.attach({
    ...caller,
    repository: pull.repository,
    number: pull.number,
  });
  scope.changed();

  return changeOf(pull);
}

// A read pull request, or the reason it could not be read, as an Agent sees it.
export type Listed =
  | ChangeItem
  | { repository: string; number: number; error: string };

const described = ({ link, read }: LinkRead): Listed =>
  read instanceof Error
    ? { repository: link.repository, number: link.number, error: read.message }
    : changeOf(read);

// The Session's pull requests: each as GitHub reports it, or with why it could not be read, never silently left out.
export async function list(
  source: ChangesSource,
  { sessionId }: Caller,
): Promise<{ changes: Listed[] }> {
  return { changes: (await readLinks(source, [sessionId])).map(described) };
}
