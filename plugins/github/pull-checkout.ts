import type { Argo } from '@argo/plugin-kit';
import type { ChangeItem } from './pull-change';
import { repositoryOfOrigin } from './pull-reference';
import type { SessionCaller } from './session-caller';

// Where a Session's Checkout is: the repository of its Project's origin and the branch it is on; either is null where unknown.
export type CheckoutIdentity = {
  repository: string | null;
  branch: string | null;
};

async function originOf(
  { projects }: Pick<Argo, 'projects'>,
  projectId: string,
): Promise<string | null> {
  const project = (await projects.list()).find(({ id }) => id === projectId);

  return project?.originUrl ?? null;
}

async function branchOf(
  { sessions }: Pick<Argo, 'sessions'>,
  { projectId, sessionId }: SessionCaller,
): Promise<string | null> {
  const session = await sessions.get(sessionId);

  return session?.projectId === projectId ? session.branch : null;
}

/*
 * The Session's Checkout as the Plugin can name it. A Project that is gone, a Session that is gone, an origin that is
 * not on GitHub and a Session on no branch each leave their part null, and a null part matches nothing.
 */
export async function checkoutIdentity(
  argo: Pick<Argo, 'projects' | 'sessions'>,
  caller: SessionCaller,
): Promise<CheckoutIdentity> {
  return {
    repository: repositoryOfOrigin(await originOf(argo, caller.projectId)),
    branch: await branchOf(argo, caller),
  };
}

const lower = (name: string | null | undefined): string | undefined =>
  name?.toLowerCase();

const sameBranch = (change: ChangeItem, checkout: CheckoutIdentity): boolean =>
  checkout.branch !== null && change.branch === checkout.branch;

const sameRepository = (
  change: ChangeItem,
  checkout: CheckoutIdentity,
): boolean =>
  checkout.repository !== null &&
  lower(change.headRepository) === lower(checkout.repository);

/*
 * Whether a pull request is the same line of work as the Session's Checkout: its head is the Checkout's branch of the
 * Checkout's repository. It is explicit identity, repository plus branch (ADR-0052), never a title and never a branch
 * name alone, so another fork's same-named branch is not the Checkout's.
 */
const isOnCheckout = (
  change: ChangeItem,
  checkout: CheckoutIdentity,
): boolean => sameBranch(change, checkout) && sameRepository(change, checkout);

// The Change, marked when it is the Checkout's own line of work.
export const markedOf = (
  change: ChangeItem,
  checkout: CheckoutIdentity,
): ChangeItem =>
  isOnCheckout(change, checkout)
    ? { ...change, onCheckout: true as const }
    : change;

// The Changes, with the one that is the Checkout's own line of work marked.
export const markCheckout = (
  changes: readonly ChangeItem[],
  checkout: CheckoutIdentity,
): ChangeItem[] => changes.map((change) => markedOf(change, checkout));
