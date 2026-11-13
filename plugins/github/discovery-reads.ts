import type { Argo } from '@argo/plugin-kit';
import { valueAt, type Json } from './pull-info';
import { githubHost } from './pull-reads';
import type { PullReference } from './pull-reference';

type Fetch = Argo['fetch'];

const okStatus = 200;

const unauthorizedStatus = 401;

const signInMessage = 'Sign in to GitHub to look for pull requests.';

// Why GitHub could not be asked; `signIn` says whether signing in would help.
export class Unavailable extends Error {
  readonly signIn: boolean;

  constructor(message: string, signIn: boolean) {
    super(message);
    this.signIn = signIn;
  }
}

// Where to look: this branch of this origin, as the Project's Account sees GitHub.
export type Lookup = {
  fetch: Fetch;
  projectId: string;
  repository: string;
  branch: string;
};

const refusalOf = (status: number): Unavailable | null => {
  if (status === okStatus) return null;

  return status === unauthorizedStatus
    ? new Unavailable(signInMessage, true)
    : new Unavailable(`GitHub answered ${status}.`, false);
};

async function bodyOf(
  { fetch, projectId }: Pick<Lookup, 'fetch' | 'projectId'>,
  path: string,
): Promise<string> {
  const reply = await fetch(`https://${githubHost}${path}`, {
    method: 'GET',
    headers: { accept: 'application/vnd.github+json' },
    account: githubHost,
    projectId,
  });

  if (!reply) throw new Unavailable(signInMessage, true);

  const refusal = refusalOf(reply.status);

  if (refusal) throw refusal;

  return reply.text();
}

const nameAt = (pull: Json, side: string): string | null => {
  const name = valueAt(pull, [side, 'repo', 'full_name']);

  return typeof name === 'string' ? name : null;
};

type Listed = { number: number; head: string | null; base: string | null };

const listedOf = (pull: Json): Listed => ({
  number: Number(valueAt(pull, ['number'])),
  head: nameAt(pull, 'head'),
  base: nameAt(pull, 'base'),
});

const listedPulls = (body: string): Listed[] => {
  const pulls: Json = JSON.parse(body);

  return Array.isArray(pulls) ? pulls.map(listedOf) : [];
};

const sameName = (one: string | null, other: string): boolean =>
  one?.toLowerCase() === other.toLowerCase();

/*
 * The repositories whose pull requests can come from this origin: the origin itself, and the repository it was forked
 * from, where a fork's work is proposed.
 */
export async function targetsOf(lookup: Lookup): Promise<string[]> {
  const info: Json = JSON.parse(
    await bodyOf(lookup, `/repos/${lookup.repository}`),
  );

  const parent = valueAt(info, ['parent', 'full_name']);

  return typeof parent === 'string'
    ? [lookup.repository, parent]
    : [lookup.repository];
}

const headOf = ({ repository, branch }: Lookup): string =>
  encodeURIComponent(`${repository.split('/')[0]}:${branch}`);

// Pull requests of `target`, in any state, whose head is this branch of this origin; another fork's same-named branch is not.
export async function proposedFrom(
  lookup: Lookup,
  target: string,
): Promise<PullReference[]> {
  const body = await bodyOf(
    lookup,
    `/repos/${target}/pulls?head=${headOf(lookup)}&state=all&per_page=100`,
  );

  return listedPulls(body)
    .filter(
      ({ head, base }) =>
        sameName(head, lookup.repository) && sameName(base, target),
    )
    .map(({ number }) => ({ repository: target, number }));
}
