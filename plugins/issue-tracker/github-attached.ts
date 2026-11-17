import { graphqlRequest, type GitHubRequest } from './github-api';
import { detailFields, flatten, split } from './github-documents';
import { mapIssue, type Issue } from './github-issues';
import { at, isObject, type Json } from './json';

type Read = (request: GitHubRequest) => Promise<Json>;

// The most Issues one call reads in full; more are read in further calls.
const issuesPerCall = 50;

// A number that is not a whole one is never written into the query.
const aliased = (number: number): string[] =>
  Number.isSafeInteger(number)
    ? [`issue${number}: issue(number: ${number}) { ${detailFields} }`]
    : [];

// Several Issues in one call, each under its own alias.
const issuesQuery = (
  repository: string,
  numbers: readonly number[],
): GitHubRequest => {
  const [owner, name] = split(repository);

  return graphqlRequest(
    `query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { ${numbers.flatMap(aliased).join('\n')} }
    }`,
    { owner, name },
  );
};

// The Issues GitHub found of those asked for: one that is gone answers null under its alias and is left out.
function mapIssues(data: Json): Issue[] {
  const repository = at(data, 'repository');

  if (!isObject(repository))
    throw new Error('GitHub returned an invalid Issue list.');

  return Object.values(repository).flatMap((node) =>
    isObject(node) ? [mapIssue(flatten(node))] : [],
  );
}

const chunksOf = (numbers: readonly number[]): number[][] =>
  Array.from(
    { length: Math.ceil(numbers.length / issuesPerCall) },
    (_, index) =>
      numbers.slice(index * issuesPerCall, (index + 1) * issuesPerCall),
  );

// The Issues with these numbers that GitHub still has, read together.
export async function readIssues(
  read: Read,
  repository: string,
  numbers: readonly number[],
): Promise<Issue[]> {
  const chunks = await Promise.all(
    chunksOf(numbers).map(async (chunk) =>
      mapIssues(await read(issuesQuery(repository, chunk))),
    ),
  );

  return chunks.flat();
}
