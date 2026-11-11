import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { childIssue, childNumber, parentIssue } from './github-issue-nodes';
import { isObject, parseJson, pick, type Json, type JsonObject } from './json';

// The token of the second person the fixture signs in.
export const secondToken = 'token-2';

export const textOf = (value: Json | undefined): string =>
  typeof value === 'string' ? value : '';

export const answer = (body: string, status?: number): FixtureAnswer => ({
  status,
  text: body,
});

const variablesOf = (body: Json): JsonObject => {
  const variables = pick(body, 'variables');

  return isObject(variables) ? variables : {};
};

const overviewData = (variables: JsonObject): string =>
  JSON.stringify({
    repository: {
      labels: { nodes: [{ name: 'fixture' }, { name: 'good first issue' }] },
    },
    ...Object.fromEntries(
      Object.entries(variables).flatMap(([key, query]) =>
        key.startsWith('count')
          ? [[key, { issueCount: textOf(query).includes('is:closed') ? 0 : 2 }]]
          : [],
      ),
    ),
  });

// The second person sees the Issue under their own name, so a read of the first person's is told apart.
const titledFor = <Node extends { title: string }>(
  node: Node,
  token: string,
): Node =>
  token === secondToken ? { ...node, title: `${node.title} (as hubot)` } : node;

const issueData = (variables: JsonObject, token: string): string =>
  JSON.stringify({
    repository: {
      issue: titledFor(
        Number(variables.number) === childNumber ? childIssue() : parentIssue(),
        token,
      ),
    },
  });

const searchData = (variables: JsonObject): string => {
  const closed = textOf(variables.query).includes('is:closed');

  return JSON.stringify({
    search: { nodes: closed ? [] : [parentIssue(), childIssue()] },
  });
};

export function dataOf(request: FixtureRequest): string {
  const body = parseJson(request.body);
  const variables = variablesOf(body);

  if ('count0' in variables) return overviewData(variables);

  if (textOf(pick(body, 'query')).includes('issue(number:'))
    return issueData(variables, tokenOf(request));

  return searchData(variables);
}

export const tokenOf = (request: FixtureRequest): string =>
  String(request.headers.authorization ?? '').replace('Bearer ', '');
