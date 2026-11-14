import type { Argo } from '@argo/plugin-kit';
import {
  proposedFrom,
  targetsOf,
  Unavailable,
  type Lookup,
} from './discovery-reads';
import { repositoryOfOrigin, type PullReference } from './pull-reference';
import type { PullStore } from './pull-store';
import type { SessionCaller } from './session-caller';

type Scope = Pick<Argo, 'fetch' | 'changed'> & { store: PullStore };

// What discovery found, or why it could not look; each is its own answer so an Agent never reads one as another.
export type Discovered =
  | { result: 'found'; pullRequests: PullReference[] }
  | { result: 'no-match'; branch: string; repositories: string[] }
  | { result: 'branchless' }
  | { result: 'not-github' }
  | { result: 'unavailable'; signIn: boolean; message: string };

export type Checkout = { originUrl: string | null; branch: string | null };

type Ready = { repository: string; branch: string };

function readyOf({ originUrl, branch }: Checkout): Ready | Discovered {
  const repository = repositoryOfOrigin(originUrl);

  if (!repository) return { result: 'not-github' };

  return branch ? { repository, branch } : { result: 'branchless' };
}

const isReady = (checked: Ready | Discovered): checked is Ready =>
  'repository' in checked;

const unavailable = (cause: unknown): Discovered => ({
  result: 'unavailable',
  signIn: cause instanceof Unavailable && cause.signIn,
  message: cause instanceof Error ? cause.message : String(cause),
});

async function look(
  lookup: Lookup,
): Promise<{ found: PullReference[]; looked: string[] }> {
  const looked = await targetsOf(lookup);

  const found = await Promise.all(
    looked.map((target) => proposedFrom(lookup, target)),
  );

  return { found: found.flat(), looked };
}

async function remember(
  { store, changed }: Scope,
  found: readonly PullReference[],
  caller: SessionCaller,
): Promise<void> {
  await Promise.all(found.map((pull) => store.attach({ ...caller, ...pull })));
  changed();
}

async function lookAndRemember(
  scope: Scope,
  ready: Ready,
  caller: SessionCaller,
): Promise<Discovered> {
  const { found, looked } = await look({
    ...ready,
    fetch: scope.fetch,
    projectId: caller.projectId,
  });

  if (found.length === 0)
    return { result: 'no-match', branch: ready.branch, repositories: looked };

  await remember(scope, found, caller);

  return { result: 'found', pullRequests: found };
}

/*
 * Looks on GitHub for the pull requests of the Session's current branch and stores each one found. It only reads
 * GitHub, and removes nothing: an earlier association stays whatever the branch is now, and a failed look leaves
 * every link as it was. A pull request is stored under the repository it targets, so a fork's is never the origin's.
 */
export async function discover(
  scope: Scope,
  checkout: Checkout,
  caller: SessionCaller,
): Promise<Discovered> {
  const ready = readyOf(checkout);

  if (!isReady(ready)) return ready;

  try {
    return await lookAndRemember(scope, ready, caller);
  } catch (cause) {
    return unavailable(cause);
  }
}
