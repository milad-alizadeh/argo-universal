import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem } from './pull-change';
import {
  readLinks,
  refreshOf,
  type ChangesSource,
  type LinkRead,
} from './pull-changes';
import {
  checkoutIdentity,
  markedOf,
  type CheckoutIdentity,
} from './pull-checkout';
import { discover, type Checkout, type Discovered } from './pull-discovery';
import { failureMessage } from './pull-known';
import { fetchPull } from './pull-reads';
import { parseReference, type PullReference } from './pull-reference';
import { sessionInProject, type SessionCaller } from './session-caller';

type ProjectInfo = Awaited<ReturnType<Argo['projects']['list']>>[number];

export type Scope = Pick<Argo, 'projects' | 'sessions' | 'fetch' | 'changed'> &
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
  caller: SessionCaller,
): Promise<Checkout> {
  const project = await projectOf(scope, caller.projectId);
  const session = await sessionInProject(scope, caller);

  return { originUrl: project.originUrl, branch: session.branch };
}

// The pull request a reference names for the caller's Session, a bare number meaning the Project's own repository.
export async function namedOf(
  scope: Scope,
  reference: string,
  caller: SessionCaller,
): Promise<PullReference> {
  return parseReference(reference, (await checkoutOf(scope, caller)).originUrl);
}

/*
 * Looks for the pull requests of the Session's current branch and stores them, in the repository each one targets.
 * Running it again, or after a branch switch, keeps every earlier association.
 */
export async function discoverFor(
  scope: Scope,
  caller: SessionCaller,
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
  caller: SessionCaller,
): Promise<Attached> {
  const named = parseReference(
    reference,
    (await checkoutOf(scope, caller)).originUrl,
  );
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
  caller: SessionCaller,
): Promise<{ repository: string; number: number }> {
  const named = parseReference(
    reference,
    (await checkoutOf(scope, caller)).originUrl,
  );

  await scope.store.detach({ ...named, ...caller });
  scope.changed();

  return named;
}

// A read pull request, or the reason it could not be read, as an Agent sees it.
export type Listed =
  | ChangeItem
  | { repository: string; number: number; error: string };

const markedListed = (entry: Listed, checkout: CheckoutIdentity): Listed =>
  'error' in entry ? entry : markedOf(entry, checkout);

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
  scope: Pick<Scope, 'projects' | 'sessions'>,
  caller: SessionCaller,
): Promise<{ changes: Listed[] }> {
  const checkout = await checkoutIdentity(scope, caller);
  const reads = await readLinks(source, [caller.sessionId]);

  return {
    changes: reads.map(described).map((entry) => markedListed(entry, checkout)),
  };
}
