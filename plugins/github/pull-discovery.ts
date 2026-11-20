import type { Argo } from '@argo/plugin-kit';
import {
  proposedFrom,
  targetsOf,
  Unavailable,
  type Lookup,
} from './discovery-reads';
import { repositoryOfOrigin, type PullReference } from './pull-reference';
import type { PullStore } from './pull-store';
import type { Pulls } from './pull-sync';
import type { SessionCaller } from './session-caller';

type Scope = Pick<Argo, 'fetch' | 'changed'> &
  Pick<Pulls, 'sync'> & { store: PullStore };

// What discovery found, or why it could not look (`attached`: asked to look only while the Session has none); each is its own answer so an Agent never reads one as another.
export type Discovered =
  | { result: 'found'; pullRequests: PullReference[] }
  | { result: 'detached'; pullRequests: PullReference[] }
  | { result: 'no-match'; branch: string; repositories: string[] }
  | { result: 'branchless' }
  | { result: 'attached' }
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
  { store, sync, changed }: Scope,
  found: readonly PullReference[],
  caller: SessionCaller,
): Promise<void> {
  await Promise.all(found.map((pull) => store.attach({ ...caller, ...pull })));
  // Each one found is read and kept before the answer, so every surface shows it at once.
  await sync([caller.sessionId]);
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

  return rememberKept(scope, found, caller);
}

// Stores each one found that was never detached from the Session; when every one was, nothing is stored.
async function rememberKept(
  scope: Scope,
  found: readonly PullReference[],
  caller: SessionCaller,
): Promise<Discovered> {
  const kept = await notDetached(scope, found, caller);

  if (kept.length === 0)
    return { result: 'detached', pullRequests: [...found] };

  await remember(scope, kept, caller);

  return { result: 'found', pullRequests: kept };
}

// A pull request detached from the Session stays detached: discovery never attaches it to that Session again (#2470).
async function notDetached(
  { store }: Scope,
  found: readonly PullReference[],
  caller: SessionCaller,
): Promise<PullReference[]> {
  const detached = await Promise.all(
    found.map((pull) => store.detached({ ...caller, ...pull })),
  );

  return found.filter((_, index) => !detached[index]);
}

/*
 * Looks on GitHub for the pull requests of the Session's current branch and stores each one found that was never
 * detached from the Session. It only reads
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
