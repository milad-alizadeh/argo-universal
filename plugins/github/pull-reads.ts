import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { valueAt, type Json } from './json';
import { checksPageSize, parseChecks, type CheckInfo } from './pull-checks';
import { parsePull, type PullInfo } from './pull-info';
import type { PullReference } from './pull-reference';

// The one Account every read borrows, named by the API host its token opens (ADR-0036).
export const githubHost = 'api.github.com';

const okStatus = 200;

export const shortHead = 7;

const unauthorizedStatus = 401;

const forbiddenStatus = 403;

const notFoundStatus = 404;

const tooManyStatus = 429;

export type PullTarget = PullReference & { projectId: string };

// The Checks of one commit of a repository, for the Project whose Account reads them.
export type ChecksTarget = {
  repository: string;
  head: string;
  projectId: string;
};

type Fetch = Argo['fetch'];

// What a missing or refused sign-in says, so a failure that signing in would mend is told apart from the rest.
export const signInMessage =
  'Sign in to GitHub. Open Settings › Plugins › GitHub and choose Continue with GitHub.';

// A missing Account answers null; inside a Query, which cannot ask to sign in, it is refused.
const unavailable = 'Account is unavailable';

export const needsSignIn = (message: string): boolean =>
  message.includes(signInMessage) || message.includes(unavailable);

// What a read refused for GitHub's rate limit says, so the Change can say why it stopped updating.
const rateLimitMessage = 'GitHub rate limit reached.';

export const rateLimited = (message: string): boolean =>
  message.includes(rateLimitMessage);

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

const headerOf = ({ headers }: Reply, name: string): string | undefined =>
  Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];

// GitHub refuses a spent limit with 429, or with 403 and the headers that say so; any other 403 is a refusal.
const saysSpent = (reply: Reply): boolean =>
  headerOf(reply, 'retry-after') !== undefined ||
  headerOf(reply, 'x-ratelimit-remaining') === '0';

export const isRateLimit = (reply: Reply): boolean =>
  reply.status === tooManyStatus ||
  (reply.status === forbiddenStatus && saysSpent(reply));

const refusals = new Map<number, (subject: string) => string>([
  [unauthorizedStatus, (): string => signInMessage],
  [
    notFoundStatus,
    (subject: string): string =>
      `${subject} was not found on GitHub, or this account cannot see it.`,
  ],
]);

const refusalMessage = (status: number, subject: string): string =>
  refusals.get(status)?.(subject) ?? `GitHub answered ${status}.`;

// GitHub's own words in the body of a refusal, when it sent any.
function bodyMessage(body: string): string | undefined {
  try {
    const json: Json = JSON.parse(body);
    const message = valueAt(json, ['message']);

    return typeof message === 'string' && message.trim() !== ''
      ? message.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

// Why GitHub refused, in its own words: the body's message, the SSO step its header asks for, and the scopes it wanted.
function reasonOf(reply: Reply): string {
  const parts = [
    bodyMessage(reply.body),
    headerOf(reply, 'x-github-sso') &&
      `SSO: ${headerOf(reply, 'x-github-sso')}`,
    headerOf(reply, 'x-accepted-oauth-scopes') &&
      `Accepted scopes: ${headerOf(reply, 'x-accepted-oauth-scopes')}`,
  ].filter(Boolean);

  return parts.length > 0 ? ` ${parts.join('. ')}` : '';
}

// A 401 and a 404 already say what to do; any other refusal also says why GitHub gave it.
const refusalText = (reply: Reply, subject: string): string =>
  refusals.has(reply.status)
    ? refusalMessage(reply.status, subject)
    : `${refusalMessage(reply.status, subject)}${reasonOf(reply)}`;

const refusalOf = (reply: Reply, subject: string): Error =>
  new Error(
    isRateLimit(reply) ? rateLimitMessage : refusalText(reply, subject),
  );

export const call = (path: string, projectId: string): Parameters<Fetch> => [
  `https://${githubHost}${path}`,
  {
    method: 'GET',
    headers: { accept: 'application/vnd.github+json' },
    account: githubHost,
    projectId,
  },
];

// The body of a successful call; a missing Account, a refusal or a failed call throws, never answers as nothing.
export async function bodyOf(
  fetch: Fetch,
  request: Parameters<Fetch>,
  subject: string,
): Promise<string> {
  const reply = await fetch(...request);

  if (!reply) throw new Error(signInMessage);

  if (reply.status !== okStatus) throw refusalOf(reply, subject);

  return reply.text();
}

// One pull request as the signed-in person sees it.
export async function fetchPull(
  fetch: Fetch,
  { repository, number, projectId }: PullTarget,
): Promise<PullInfo> {
  return parsePull(
    await bodyOf(
      fetch,
      call(`/repos/${repository}/pulls/${number}`, projectId),
      `${repository}#${number}`,
    ),
  );
}

// The Checks of one commit as the signed-in person sees them.
export async function fetchChecks(
  fetch: Fetch,
  { repository, head, projectId }: ChecksTarget,
): Promise<CheckInfo[]> {
  return parseChecks(
    await bodyOf(
      fetch,
      call(
        `/repos/${repository}/commits/${head}/check-runs?per_page=${checksPageSize}`,
        projectId,
      ),
      `The Checks of ${repository}@${head.slice(0, shortHead)}`,
    ),
  );
}

export type PullReads = {
  // One pull request, shared by every Slot and Operation that asks for it.
  pull: (target: PullTarget) => NamedQuery<PullInfo>;
  // The Checks of one head commit, read once the pull request has said which it is.
  checks: (target: ChecksTarget) => NamedQuery<CheckInfo[]>;
};

/*
 * Named reads (ADR-0037): the Slot's answer and a later page asking the same question share the one entry Argo keeps,
 * and an Operation run, or the Slot's refresh, makes it due. They only read, and a failed read throws, so Argo keeps
 * the last good answer beside the failure instead of replacing it with one.
 */
export const definePullReads = (argo: Argo): PullReads => ({
  pull: argo.queries.define(
    'pull',
    (target: PullTarget) => fetchPull(argo.fetch, target),
    { projectOf: ({ projectId }: PullTarget) => projectId },
  ),
  checks: argo.queries.define(
    'checks',
    (target: ChecksTarget) => fetchChecks(argo.fetch, target),
    { projectOf: ({ projectId }: ChecksTarget) => projectId },
  ),
});
