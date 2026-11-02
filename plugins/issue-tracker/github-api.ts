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

type GraphqlBody = { data?: unknown; errors?: { message?: unknown }[] };

export function readGraphql<Value>(
  { data, error }: RawRead,
  map: (data: unknown) => Value,
): GitHubRead<Value> {
  if (error?.includes(noAccount)) return { kind: 'signed-out' };

  if (data) return readReply(data, map);

  return error === undefined
    ? { kind: 'loading' }
    : { kind: 'failed', message: error };
}

function readReply<Value>(
  { status, body }: NonNullable<RawRead['data']>,
  map: (data: unknown) => Value,
): GitHubRead<Value> {
  if (status === 401) return { kind: 'unauthorized' };

  if (status !== 200)
    return { kind: 'failed', message: `GitHub answered ${status}.` };

  return readBody(body, map);
}

function readBody<Value>(
  body: string,
  map: (data: unknown) => Value,
): GitHubRead<Value> {
  try {
    const reply = Object(JSON.parse(body)) as GraphqlBody;

    // GitHub answers part of a query when some of it fails, such as one search; the rest is still the answer.
    if (reply.data) return { kind: 'ok', value: map(reply.data) };

    return { kind: 'failed', message: firstError(reply) };
  } catch (cause) {
    return { kind: 'failed', message: String(cause) };
  }
}

function firstError({ errors }: GraphqlBody): string {
  const message = errors?.[0]?.message;

  return typeof message === 'string' ? message : 'GitHub returned no data.';
}
