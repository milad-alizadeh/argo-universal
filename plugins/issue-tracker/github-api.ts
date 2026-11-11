import type { Argo } from '@argo/plugin-kit';
import {
  isObject,
  item,
  parseJson,
  pick,
  type Json,
  type JsonObject,
} from './json';

// The one Account every read borrows, named by the API host its token opens (ADR-0036).
export const githubHost = 'api.github.com';

const graphqlUrl = `https://${githubHost}/graphql`;

const unauthorizedStatus = 401;

const okStatus = 200;

/*
 * Signing in is the way forward: no Account answered the borrow, or GitHub no longer accepts its token. A page
 * answers it with the sign-in page, not an error.
 */
export class SignInRequired extends Error {
  // The kit's gate recognises this error by its name; a module its unit tests load cannot import the kit.
  override name = 'SignInRequired';
}

type Fetch = Argo['fetch'];

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

// A GraphQL call; the Account and the Project are added as the call is made.
export type GitHubRequest = {
  url: string;
  init: NonNullable<Parameters<Fetch>[1]>;
};

export const graphqlRequest = (
  document: string,
  variables: Record<string, string | number>,
): GitHubRequest => ({
  url: graphqlUrl,
  init: {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: document, variables }),
  },
});

// The reply of a call made as the signed-in person; nothing came back when no Account answered.
export async function called(
  fetch: Fetch,
  projectId: string,
  { url, init }: GitHubRequest,
): Promise<Reply> {
  const reply = await fetch(url, { ...init, account: githubHost, projectId });

  if (!reply) throw new SignInRequired('Sign in to GitHub.');

  if (reply.status === unauthorizedStatus)
    throw new SignInRequired('GitHub no longer accepts this sign-in.');

  return reply;
}

// An answer with nothing in it, as `{ repository: { issue: null } }` for an Issue that is not there.
const hollow = (value: Json | undefined): boolean =>
  value === null || (isObject(value) && Object.values(value).every(hollow));

const hasErrors = (answer: Json): boolean =>
  Array.isArray(pick(answer, 'errors'));

function firstError(reply: Json): string {
  const message = pick(item(pick(reply, 'errors'), 0), 'message');

  return typeof message === 'string' ? message : 'GitHub returned no data.';
}

// The `data` of a GraphQL answer; GitHub answers part of a query when some of it fails, and the rest is still the answer.
export async function graphqlData(
  fetch: Fetch,
  projectId: string,
  request: GitHubRequest,
): Promise<Json> {
  const reply = await called(fetch, projectId, request);

  if (reply.status !== okStatus)
    throw new Error(`GitHub answered ${reply.status}.`);

  return dataOf(parseJson(await reply.text()));
}

// Data GitHub filled, not hollowed and then explained by its errors.
const usable = (data: Json | undefined, answer: Json): data is JsonObject =>
  isObject(data) && !(hollow(data) && hasErrors(answer));

// The answer's data, unless GitHub left it hollow and said why.
function dataOf(answer: Json): Json {
  const data = pick(answer, 'data');

  if (usable(data, answer)) return data;

  throw new Error(firstError(answer));
}
