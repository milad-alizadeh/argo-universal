import type { Argo } from '@argo/plugin-kit';
import { valueAt, type Json } from './json';
import { githubHost } from './pull-reads';

type Fetch = Argo['fetch'];

export const invalidAutoMerge = 'GitHub returned an invalid auto-merge state.';

const headers = {
  accept: 'application/vnd.github+json',
  'content-type': 'application/json',
};

// GitHub's GraphQL endpoint on the Account's host: the only place the Plugin writes (ADR-0052).
export const graphql = (
  query: string,
  variables: Record<string, string | number>,
  projectId: string,
): Parameters<Fetch> => [
  `https://${githubHost}/graphql`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    account: githubHost,
    projectId,
  },
];

const errorsOf = (reply: Json): Json[] => {
  const errors = valueAt(reply, ['errors']);

  return Array.isArray(errors) ? errors : [];
};

const messageOf = (error: Json, invalid: string): string => {
  const message = valueAt(error, ['message']);

  return typeof message === 'string' ? message : invalid;
};

// GraphQL answers 200 with `errors` when it refuses, so the reply is read before it is trusted.
export function dataOf(body: string, invalid: string): Json {
  const reply: Json = JSON.parse(body);
  const [first] = errorsOf(reply);

  if (first !== undefined) throw new Error(messageOf(first, invalid));

  const data = valueAt(reply, ['data']);

  if (data === undefined) throw new Error(invalid);

  return data;
}
