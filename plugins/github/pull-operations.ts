import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem } from './pull-change';
import {
  readLinks,
  refreshOf,
  type ChangesSource,
  type LinkRead,
} from './pull-changes';
import { discover, type Checkout, type Discovered } from './pull-discovery';
import { failureMessage } from './pull-known';
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
async function checkoutOf(
  scope: Scope,
  { projectId, sessionId }: Caller,
): Promise<Checkout> {
  const project = await projectOf(scope, projectId);
  const session = await scope.sessions.get(sessionId);

  if (session?.projectId !== projectId)
    throw new Error('This Session does not belong to this Project.');

  return { originUrl: project.originUrl, branch: session.branch };
}

const originOf = async (scope: Scope, caller: Caller): Promise<string | null> =>
  (await checkoutOf(scope, caller)).originUrl;

/*
 * Looks for the pull requests of the Session's current branch and stores them, in the repository each one targets.
 * Running it again, or after a branch switch, keeps every earlier association.
 */
export async function discoverFor(
  scope: Scope,
  caller: Caller,
): Promise<Discovered> {
  return discover(scope, await checkoutOf(scope, caller), caller);
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

/*
 * Removes the calling Session's association with the pull request a reference names, and nothing else: its other
 * associations stay. GitHub is not asked, so a pull request that is gone can still be detached, and detaching one that
 * is not attached changes nothing.
 */
export async function detach(
  scope: Scope,
  reference: string,
  caller: Caller,
): Promise<{ repository: string; number: number }> {
  const named = parseReference(reference, await originOf(scope, caller));

  await scope.store.detach({ ...named, ...caller });
  scope.changed();

  return named;
}

// A read pull request, or the reason it could not be read, as an Agent sees it.
export type Listed =
  | ChangeItem
  | { repository: string; number: number; error: string };

const described = (read: LinkRead): Listed =>
  read.pull.data
    ? changeOf(read.pull.data, refreshOf(read))
    : {
        repository: read.link.repository,
        number: read.link.number,
        error: failureMessage(read.pull),
      };

/*
 * The Session's pull requests: each as GitHub reports it, one that could not be refreshed marked stale with what was
 * last known, and one never read with why, never silently left out.
 */
export async function list(
  source: ChangesSource,
  { sessionId }: Caller,
): Promise<{ changes: Listed[] }> {
  return { changes: (await readLinks(source, [sessionId])).map(described) };
}

/*
 * Asks GitHub again for the Session's pull requests, now rather than when the Slot next does: the retry a person or an
 * Agent runs after restoring access or the network. Everything the Plugin kept is made due first, so a failed read is
 * read again and what answers is what GitHub says.
 */
export async function refresh(
  source: ChangesSource,
  scope: Pick<Scope, 'changed'>,
  caller: Caller,
): Promise<{ changes: Listed[] }> {
  scope.changed();

  return list(source, caller);
}
