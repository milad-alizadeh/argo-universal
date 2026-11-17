import type { Argo } from '@argo/plugin-kit';
import type { MergeMethod } from './pull-automation';
import { dataOf, graphql, invalidAutoMerge, refusalOf } from './pull-graphql';
import { bodyOf } from './pull-reads';

type Fetch = Argo['fetch'];

const enableMutation =
  'mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) { enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) { pullRequest { id } } }';

const mergeMutation =
  'mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) { mergePullRequest(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) { pullRequest { id } } }';

const disableMutation =
  'mutation($pullRequestId: ID!) { disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) { pullRequest { id } } }';

async function mutate(fetch: Fetch, request: Parameters<Fetch>): Promise<void> {
  dataOf(await bodyOf(fetch, request, 'Auto-merge'), invalidAutoMerge);
}

type Enable = { nodeId: string; method: MergeMethod; projectId: string };

// One of the two mutations that name a pull request and a merge method: enable auto-merge, or merge now.
const methodRequest =
  (mutation: string) =>
  ({ nodeId, method, projectId }: Enable): Parameters<Fetch> =>
    graphql(
      mutation,
      { pullRequestId: nodeId, mergeMethod: method },
      projectId,
    );

const enableRequest = methodRequest(enableMutation);

const mergeRequest = methodRequest(mergeMutation);

// GitHub refuses to queue auto-merge on a pull request it could merge now; its words, as the API gives them.
const cleanStatus = /is in clean status/i;

/*
 * Turns on GitHub's auto-merge. A pull request GitHub could merge now has nothing to wait for, so GitHub refuses to
 * queue it; it is merged at once with the same method, as `gh pr merge --auto` does (ADR-0052).
 */
export async function enableAutoMerge(
  fetch: Fetch,
  enable: Enable,
): Promise<void> {
  const body = await bodyOf(fetch, enableRequest(enable), 'Auto-merge');

  if (cleanStatus.test(refusalOf(body) ?? ''))
    return mutate(fetch, mergeRequest(enable));

  dataOf(body, invalidAutoMerge);
}

export const disableAutoMerge = (
  fetch: Fetch,
  { nodeId, projectId }: { nodeId: string; projectId: string },
): Promise<void> =>
  mutate(fetch, graphql(disableMutation, { pullRequestId: nodeId }, projectId));
