import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { parsePull, type PullInfo } from './pull-info';
import type { PullReference } from './pull-reference';

// The one Account every read borrows, named by the API host its token opens (ADR-0036).
export const githubHost = 'api.github.com';

const okStatus = 200;

const unauthorizedStatus = 401;

const notFoundStatus = 404;

/*
 * What a read answers: the value, or why there is none. Argo keeps the answer, so a failed read stays a failure the
 * Slot reports instead of becoming an empty list; a sign-in, which says `argo.changed()`, makes it due again.
 */
export type Settled =
  | { ok: true; value: PullInfo }
  | { ok: false; signIn: boolean; message: string };

export type PullTarget = PullReference & { projectId: string };

type Fetch = Argo['fetch'];

const signInMessage = 'Sign in to GitHub to read this pull request.';

// A missing Account answers null; inside a Query, which cannot ask to sign in, it is refused.
const unavailable = 'Account is unavailable';

function refusalOf(
  status: number,
  { repository, number }: PullReference,
): Error {
  if (status === unauthorizedStatus) return new Error(signInMessage);

  return new Error(
    status === notFoundStatus
      ? `${repository}#${number} was not found on GitHub, or this account cannot see it.`
      : `GitHub answered ${status}.`,
  );
}

const pullRequest = ({
  repository,
  number,
  projectId,
}: PullTarget): Parameters<Fetch> => [
  `https://${githubHost}/repos/${repository}/pulls/${number}`,
  {
    method: 'GET',
    headers: { accept: 'application/vnd.github+json' },
    account: githubHost,
    projectId,
  },
];

// One pull request as the signed-in person sees it; a missing Account, a refusal or a failed call throws.
export async function fetchPull(
  fetch: Fetch,
  target: PullTarget,
): Promise<PullInfo> {
  const reply = await fetch(...pullRequest(target));

  if (!reply) throw new Error(signInMessage);

  if (reply.status !== okStatus) throw refusalOf(reply.status, target);

  return parsePull(await reply.text());
}

const needsSignIn = (message: string): boolean =>
  message === signInMessage || message === unavailable;

async function settle(run: () => Promise<PullInfo>): Promise<Settled> {
  try {
    return { ok: true, value: await run() };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    return { ok: false, signIn: needsSignIn(message), message };
  }
}

export type PullReads = {
  // One pull request, shared by every Slot and Operation that asks for it.
  pull: (target: PullTarget) => NamedQuery<Settled>;
};

/*
 * A named read (ADR-0037): the Slot's answer and a later page asking the same question share the one entry Argo keeps,
 * and an Operation run makes it due. It only reads.
 */
export const definePullReads = (argo: Argo): PullReads => ({
  pull: argo.queries.define(
    'pull',
    (target: PullTarget) => settle(() => fetchPull(argo.fetch, target)),
    { projectOf: ({ projectId }: PullTarget) => projectId },
  ),
});

// The pull request, or the reason there is none, as an Error the caller's own failure handling reports.
export function unwrap(settled: Settled): PullInfo {
  if (settled.ok) return settled.value;

  throw new Error(settled.message);
}
