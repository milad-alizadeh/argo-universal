import { isObject, item, parseJson, pick, type Json } from './json';

// The one Account every read borrows, named by the API host its token opens (ADR-0036).
export const githubHost = 'api.github.com';

const graphqlUrl = `https://${githubHost}/graphql`;

// A GraphQL call as a Query (ADR-0037): equal documents and variables share one entry.
export type GitHubQuery = {
  api: 'fetch';
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  account: string;
};

export const graphqlQuery = (
  document: string,
  variables: Record<string, string | number>,
): GitHubQuery => ({
  api: 'fetch',
  url: graphqlUrl,
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: document, variables }),
  account: githubHost,
});

/*
 * What a page does with a GitHub read: wait, sign in (there is no Account, or GitHub rejected its token), say why it
 * failed, or use the value.
 */
export type GitHubRead<Value> =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'unauthorized' }
  | { kind: 'failed'; message: string }
  | { kind: 'ok'; value: Value };

// What `useData` hands back for a fetch Query.
export type RawRead = {
  data: { status: number; body: string } | undefined;
  error: string | undefined;
};

// A borrow that returns nothing is an `error`; a 401 is data, which the Plugin reads (ADR-0037).
const noAccount = 'Account is unavailable';

export const unauthorizedStatus = 401;

const okStatus = 200;

const lacksAccount = (error: string | undefined): boolean =>
  error !== undefined && error.includes(noAccount);

const waiting = (error: string | undefined): GitHubRead<never> =>
  error === undefined
    ? { kind: 'loading' }
    : { kind: 'failed', message: error };

export function readGraphql<Value>(
  { data, error }: RawRead,
  map: (data: Json) => Value,
): GitHubRead<Value> {
  if (lacksAccount(error)) return { kind: 'signed-out' };

  return data ? readReply(data, map) : waiting(error);
}

function readReply<Value>(
  { status, body }: NonNullable<RawRead['data']>,
  map: (data: Json) => Value,
): GitHubRead<Value> {
  if (status === unauthorizedStatus) return { kind: 'unauthorized' };

  if (status !== okStatus)
    return { kind: 'failed', message: `GitHub answered ${status}.` };

  return readBody(body, map);
}

function readBody<Value>(
  body: string,
  map: (data: Json) => Value,
): GitHubRead<Value> {
  try {
    const reply = parseJson(body);
    const data = pick(reply, 'data');

    // GitHub answers part of a query when some of it fails, such as one search; the rest is still the answer.
    if (isObject(data)) return { kind: 'ok', value: map(data) };

    return { kind: 'failed', message: firstError(reply) };
  } catch (cause) {
    return { kind: 'failed', message: String(cause) };
  }
}

function firstError(reply: Json): string {
  const message = pick(item(pick(reply, 'errors'), 0), 'message');

  return typeof message === 'string' ? message : 'GitHub returned no data.';
}
