import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { childIssue, childNumber, parentIssue } from './github-issue-nodes';
import { isObject, parseJson, pick, type Json, type JsonObject } from './json';

// The token of the second person the fixture signs in.
export const secondToken = 'token-2';

const textOf = (value: Json | undefined): string =>
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

const missingNumber = 404;

function issueNode(
  number: number,
  closedIssues: ReadonlySet<number>,
): Omit<ReturnType<typeof parentIssue>, 'state' | 'stateReason'> & {
  state: string;
  stateReason: string | null;
} {
  const node = number === childNumber ? childIssue() : parentIssue();

  return closedIssues.has(number)
    ? { ...node, state: 'CLOSED', stateReason: 'COMPLETED' }
    : node;
}

const issueData = (
  variables: JsonObject,
  token: string,
  closedIssues: ReadonlySet<number>,
): string =>
  Number(variables.number) === missingNumber
    ? JSON.stringify({ repository: { issue: null } })
    : JSON.stringify({
        repository: {
          issue: titledFor(
            issueNode(Number(variables.number), closedIssues),
            token,
          ),
        },
      });

const aliased = /issue\d+: issue\(number: (\d+)\)/g;

// The numbers a batched read asks for, each under its own alias.
const aliasedNumbers = (query: string): number[] =>
  [...query.matchAll(aliased)].map(([, number]) => Number(number));

// Every Issue asked for under its alias; one GitHub does not have is null there.
const issuesData = (
  numbers: number[],
  token: string,
  closedIssues: ReadonlySet<number>,
): string =>
  JSON.stringify({
    repository: Object.fromEntries(
      numbers.map((number) => [
        `issue${number}`,
        number === missingNumber
          ? null
          : titledFor(issueNode(number, closedIssues), token),
      ]),
    ),
  });

// A search names the second person's Issues as the single read does, so a list's rows seed the same title.
const searchData = (variables: JsonObject, token: string): string => {
  const closed = textOf(variables.query).includes('is:closed');

  const nodes = [parentIssue(), childIssue()].map((node) =>
    titledFor(node, token),
  );

  return JSON.stringify({ search: { nodes: closed ? [] : nodes } });
};

// One Issue, or several under their aliases, when the query asks for Issues by number.
function issuesAnswer(
  request: FixtureRequest,
  closedIssues: ReadonlySet<number>,
): string | null {
  const body = parseJson(request.body);
  const query = textOf(pick(body, 'query'));
  const numbers = aliasedNumbers(query);

  if (numbers.length > 0)
    return issuesData(numbers, tokenOf(request), closedIssues);

  return query.includes('issue(number:')
    ? issueData(variablesOf(body), tokenOf(request), closedIssues)
    : null;
}

function dataOf(
  request: FixtureRequest,
  closedIssues: ReadonlySet<number>,
): string {
  const variables = variablesOf(parseJson(request.body));

  if ('count0' in variables) return overviewData(variables);

  return (
    issuesAnswer(request, closedIssues) ??
    searchData(variables, tokenOf(request))
  );
}

export const tokenOf = (request: FixtureRequest): string =>
  String(request.headers.authorization ?? '').replace('Bearer ', '');

const missingIssue = 'Could not resolve to an Issue with the number of 404.';

// GitHub's whole GraphQL answer: its data, and why a part of it is null.
export function graphqlAnswer(
  request: FixtureRequest,
  closedIssues: ReadonlySet<number> = new Set(),
): string {
  const data = dataOf(request, closedIssues);
  const missing = /"issue\d*":null/.test(data);

  return missing
    ? `{"data":${data},"errors":[{"message":"${missingIssue}"}]}`
    : `{"data":${data}}`;
}
