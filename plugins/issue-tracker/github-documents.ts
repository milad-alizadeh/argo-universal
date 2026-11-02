import { graphqlQuery, type GitHubQuery } from './github-api';
import type { GitHubIssue, Issue } from './github-issues';
import { mapIssue } from './github-issues';
import { builtInFilters } from './issue-filters';

// The repository's labels and each counted filter's Issue count, by filter id.
export type Overview = { labels: string[]; counts: Record<string, number> };

// The most labels a repository's grouping shows, and the most Issues one search answers.
const labelLimit = 100;

export const searchLimit = 100;

const listFields = `
  number title state stateReason url
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

/*
 * The labels and every count in one call: a count is a search that asks for no Issues, only how many there are.
 */
export function overviewQuery(repository: string): GitHubQuery {
  const [owner, name] = split(repository);
  const counts = countedFilters.map((_, index) => countAlias(index));

  const declarations = counts.map((alias) => `$${alias}: String!`).join(', ');

  const searches = counts
    .map(
      (alias) =>
        `${alias}: search(query: $${alias}, type: ISSUE, first: 0) { issueCount }`,
    )
    .join('\n');

  const variables = Object.fromEntries(
    countedFilters.map(({ search }, index) => [
      countAlias(index),
      `repo:${repository} is:issue ${search}`,
    ]),
  );

  return graphqlQuery(
    `query ($owner: String!, $name: String!, ${declarations}) {
      repository(owner: $owner, name: $name) { labels(first: ${labelLimit}) { nodes { name } } }
      ${searches}
    }`,
    { owner, name, ...variables },
  );
}

type Count = { issueCount?: unknown } | null | undefined;

type OverviewData = {
  repository?: { labels?: { nodes?: { name?: unknown }[] } } | null;
} & Record<string, unknown>;

export function mapOverview(data: unknown): Overview {
  const { repository, ...rest } = Object(data) as OverviewData;
  const nodes = repository?.labels?.nodes;

  if (!Array.isArray(nodes))
    throw new Error('GitHub returned an invalid label list.');

  const labels = nodes.flatMap(({ name }) =>
    typeof name === 'string' ? [name] : [],
  );

  return { labels, counts: countsOf(rest) };
}

// A count GitHub refused, such as past its search rate limit, only leaves its row without one.
function countsOf(rest: Record<string, unknown>): Overview['counts'] {
  const entries = countedFilters.flatMap(({ id }, index) => {
    const count = (rest[countAlias(index)] as Count)?.issueCount;

    return Number.isSafeInteger(count) ? [[id, Number(count)] as const] : [];
  });

  return Object.fromEntries(entries);
}

export const listQuery = (
  repository: string,
  search: string,
  first: number,
): GitHubQuery =>
  graphqlQuery(
    `query ($query: String!, $first: Int!) {
      search(query: $query, type: ISSUE, first: $first) {
        nodes { ... on Issue { ${listFields} } }
      }
    }`,
    { query: `repo:${repository} is:issue ${search} sort:created-desc`, first },
  );

export const issueQuery = (repository: string, number: number): GitHubQuery => {
  const [owner, name] = split(repository);

  return graphqlQuery(
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

export function mapIssueList(data: unknown): Issue[] {
  const nodes = (data as { search?: { nodes?: unknown } } | null)?.search
    ?.nodes;

  if (!Array.isArray(nodes))
    throw new Error('GitHub returned an invalid Issue list.');

  return nodes.flatMap((node: GraphqlIssue | null) =>
    node && typeof node === 'object' && 'number' in node
      ? [mapIssue(flatten(node))]
      : [],
  );
}

export function mapIssueDetail(data: unknown): Issue {
  const issue = (
    data as { repository?: { issue?: GraphqlIssue | null } | null } | null
  )?.repository?.issue;

  if (!issue) throw new Error('GitHub has no such Issue.');

  return mapIssue(flatten(issue));
}
