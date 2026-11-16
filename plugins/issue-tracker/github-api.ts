import type { Argo } from '@argo/plugin-kit';
import {
  at,
  isObject,
  item,
  nonEmpty,
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
  const message = pick(item(at(reply, 'errors'), 0), 'message');

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

const restBase = `https://${githubHost}/repos`;

export const repositoryUrl = (repository: string): string =>
  `${restBase}/${repository}`;

// The one check an Issue number passes before it is put in a URL.
export const issueUrl = (repository: string, number: number): string => {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Issue number must be a positive integer.');

  return `${repositoryUrl(repository)}/issues/${number}`;
};

const githubJson = { accept: 'application/vnd.github+json' };

const jsonBody = { 'content-type': 'application/json' };

// A REST call; a body is sent as JSON.
export const restRequest = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: Json,
): GitHubRequest => ({
  url,
  init: {
    method,
    headers: body === undefined ? githubJson : { ...githubJson, ...jsonBody },
    body: body === undefined ? undefined : JSON.stringify(body),
  },
});

// GitHub's own words are better than ours, but its status is enough.
export async function reasonOf(response: Reply): Promise<string> {
  try {
    const message = nonEmpty(pick(parseJson(await response.text()), 'message'));

    return message ?? `GitHub answered ${response.status}.`;
  } catch {
    return `GitHub answered ${response.status}.`;
  }
}

// The reply of a REST call GitHub accepted; its body is left unread. A refusal ends the call with GitHub's reason.
export async function accepted(
  fetch: Fetch,
  projectId: string,
  request: GitHubRequest,
): Promise<Reply> {
  const reply = await called(fetch, projectId, request);

  if (!reply.ok) throw new Error(await reasonOf(reply));

  return reply;
}

// The JSON a REST call answers with, or nothing when the body is empty.
export async function answerOf(
  fetch: Fetch,
  projectId: string,
  request: GitHubRequest,
): Promise<Json> {
  const text = await (await accepted(fetch, projectId, request)).text();

  return text === '' ? null : parseJson(text);
}
