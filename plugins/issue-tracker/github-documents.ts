import { graphqlRequest, type GitHubRequest } from './github-api';
import type { GitHubIssue, Issue } from './github-issues';
import { mapIssue } from './github-issues';
import { builtInFilters } from './issue-filters';
import { isObject, pick, type Json } from './json';
import type { Overview } from './overview';

// The most labels a repository's grouping shows, and the most Issues one search answers.
const labelLimit = 100;

export const searchLimit = 100;

const listFields = `
  number title state stateReason url createdAt
  labels(first: 20) { nodes { name color } }
  assignees(first: 10) { nodes { login } }
  parent { number }
  blockedBy(first: 20) { nodes { number title state url } }
  subIssuesSummary { completed total }`;

const relationFields = 'nodes { number title state url }';

const split = (repository: string): [string, string] => {
  const [owner = '', name = ''] = repository.split('/');

  return [owner, name];
};

const countedFilters = builtInFilters().filter(({ counted }) => counted);

const countAlias = (index: number): string => `count${index}`;

const declarationsOf = (aliases: string[]): string =>
  aliases.map((alias) => `$${alias}: String!`).join(', ');

const searchesOf = (aliases: string[]): string =>
  aliases
    .map(
      (alias) =>
        `${alias}: search(query: $${alias}, type: ISSUE, first: 0) { issueCount }`,
    )
    .join('\n');

const countVariables = (repository: string): Record<string, string> =>
  Object.fromEntries(
    countedFilters.map(({ search }, index) => [
      countAlias(index),
      `repo:${repository} is:issue ${search}`,
    ]),
  );

const overviewDocument = (
  aliases: string[],
): string => `query ($owner: String!, $name: String!, ${declarationsOf(aliases)}) {
      repository(owner: $owner, name: $name) { labels(first: ${labelLimit}) { nodes { name } } }
      ${searchesOf(aliases)}
    }`;

/*
 * The labels and every count in one call: a count is a search that asks for no Issues, only how many there are.
 */
export function overviewQuery(repository: string): GitHubRequest {
  const [owner, name] = split(repository);
  const aliases = countedFilters.map((_, index) => countAlias(index));

  return graphqlRequest(overviewDocument(aliases), {
    owner,
    name,
    ...countVariables(repository),
  });
}

const labelName = (node: Json): string[] => {
  const name = pick(node, 'name');

  return typeof name === 'string' ? [name] : [];
};

export function mapOverview(data: Json): Overview {
  const nodes = pick(pick(pick(data, 'repository'), 'labels'), 'nodes');

  if (!Array.isArray(nodes))
    throw new Error('GitHub returned an invalid label list.');

  return { labels: nodes.flatMap(labelName), counts: countsOf(data) };
}

// A count GitHub refused, such as past its search rate limit, only leaves its row without one.
function countsOf(data: Json): Overview['counts'] {
  const entries = countedFilters.flatMap(({ id }, index) => {
    const count = pick(pick(data, countAlias(index)), 'issueCount');

    return Number.isSafeInteger(count) ? [[id, Number(count)] as const] : [];
  });

  return Object.fromEntries(entries);
}

export const listQuery = (
  repository: string,
  search: string,
  first: number,
): GitHubRequest =>
  graphqlRequest(
    `query ($query: String!, $first: Int!) {
      search(query: $query, type: ISSUE, first: $first) {
        nodes { ... on Issue { ${listFields} } }
      }
    }`,
    { query: `repo:${repository} is:issue ${search} sort:created-desc`, first },
  );

export const issueQuery = (
  repository: string,
  number: number,
): GitHubRequest => {
  const [owner, name] = split(repository);

  return graphqlRequest(
    `query ($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $number) { ${listFields} body subIssues(first: 50) { ${relationFields} } }
      }
    }`,
    { owner, name, number },
  );
};

type Connection<Node> = { nodes?: Node[] } | null | undefined;

type GraphqlIssue = Omit<GitHubIssue, 'labels' | 'assignees'> & {
  labels?: Connection<NonNullable<GitHubIssue['labels']>[number]>;
  assignees?: Connection<NonNullable<GitHubIssue['assignees']>[number]>;
};

// GitHub's GraphQL wraps labels and assignees in connections; the mappers read them as lists.
const flatten = ({
  labels,
  assignees,
  ...rest
}: GraphqlIssue): GitHubIssue => ({
  ...rest,
  labels: labels?.nodes,
  assignees: assignees?.nodes,
});

const issueNode = (node: Json): Issue[] =>
  isObject(node) && 'number' in node ? [mapIssue(flatten(node))] : [];

export function mapIssueList(data: Json): Issue[] {
  const nodes = pick(pick(data, 'search'), 'nodes');

  if (!Array.isArray(nodes))
    throw new Error('GitHub returned an invalid Issue list.');

  return nodes.flatMap(issueNode);
}

export function mapIssueDetail(data: Json): Issue {
  const issue = pick(pick(data, 'repository'), 'issue');

  if (!isObject(issue)) throw new Error('GitHub has no such Issue.');

  return mapIssue(flatten(issue));
}
