import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import type { FixturePull } from './github-fixture-types';

// What GitHub says of a repository's merge settings; a repository nobody set is open to every method.
export type FixtureRepository = {
  allow_auto_merge: boolean;
  allow_squash_merge: boolean;
  allow_merge_commit: boolean;
  allow_rebase_merge: boolean;
};

export const openRepository: FixtureRepository = {
  allow_auto_merge: true,
  allow_squash_merge: true,
  allow_merge_commit: true,
  allow_rebase_merge: true,
};

export type Automated = {
  pulls: Map<string, FixturePull>;
  repositories: Map<string, FixtureRepository>;
  // Set to make GraphQL calls fail with this status.
  graphqlFailWith: { status: number | null };
};

// One auto-merge call GitHub received: turned on with a method, or turned off.
export type AutoMergeCall = {
  kind: 'enable' | 'disable';
  pullRequestId: string;
  mergeMethod?: string;
};

export const graphqlPath = '/graphql';

// What the Plugin sends GitHub's GraphQL endpoint: the read and the two mutations each fill their own variables.
type Variables = {
  pullRequestId?: string;
  mergeMethod?: string;
  owner?: string;
  name?: string;
  number?: number;
};

type Body = { query: string; variables: Variables };

const bodyOf = ({ body }: Pick<FixtureRequest, 'body'>): Body =>
  JSON.parse(body);

const byId = (
  pulls: Map<string, FixturePull>,
  id: string | undefined,
): FixturePull[] => [...pulls.values()].filter((pull) => pull.node_id === id);

function mutate(held: Automated, { query, variables }: Body): FixtureAnswer {
  const [pull] = byId(held.pulls, variables.pullRequestId);

  if (!pull)
    return { json: { errors: [{ message: 'Could not resolve to a node' }] } };

  pull.auto_merge = query.includes('enablePullRequestAutoMerge')
    ? { merge_method: String(variables.mergeMethod) }
    : null;

  return { json: { data: { pullRequest: { id: pull.node_id } } } };
}

const keyOf = ({ owner, name, number }: Variables): string =>
  `${String(owner)}/${String(name)}#${String(number)}`;

type PullAnswer = {
  id: string;
  autoMergeRequest: { mergeMethod: string } | null;
};

const pullAnswer = (pull: FixturePull): PullAnswer => ({
  id: pull.node_id,
  autoMergeRequest: pull.auto_merge
    ? { mergeMethod: pull.auto_merge.merge_method }
    : null,
});

function read(held: Automated, { variables }: Body): FixtureAnswer {
  const pull = held.pulls.get(keyOf(variables));

  return {
    json: {
      data: {
        repository: { pullRequest: pull ? pullAnswer(pull) : null },
      },
    },
  };
}

// GitHub's GraphQL endpoint, for the two auto-merge mutations and the one read of a pull request's auto-merge.
export function graphqlAnswer(
  held: Automated,
  request: FixtureRequest,
): FixtureAnswer {
  if (held.graphqlFailWith.status)
    return {
      status: held.graphqlFailWith.status,
      json: { message: 'Server Error' },
    };

  const body = bodyOf(request);

  return body.query.includes('mutation')
    ? mutate(held, body)
    : read(held, body);
}

// A repository's merge settings as the REST repository answer carries them.
export const settingsOf = (
  { repositories }: Automated,
  repository: string,
): FixtureRepository => repositories.get(repository) ?? openRepository;

const callOf = ({ query, variables }: Body): AutoMergeCall => ({
  kind: query.includes('enablePullRequestAutoMerge') ? 'enable' : 'disable',
  pullRequestId: String(variables.pullRequestId),
  ...(variables.mergeMethod !== undefined && {
    mergeMethod: variables.mergeMethod,
  }),
});

function callsOf(request: FixtureRequest): AutoMergeCall[] {
  if (request.path !== graphqlPath) return [];

  const body = bodyOf(request);

  return body.query.includes('mutation') ? [callOf(body)] : [];
}

export const autoMergeCalls = (
  requests: readonly FixtureRequest[],
): AutoMergeCall[] => requests.flatMap(callsOf);
