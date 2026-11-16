import type { Argo } from '@argo/plugin-kit';
import type { MergeMethod } from './pull-automation';
import { dataOf, graphql, invalidAutoMerge } from './pull-graphql';
import { bodyOf } from './pull-reads';

type Fetch = Argo['fetch'];

const enableMutation =
  'mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) { enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) { pullRequest { id } } }';

const disableMutation =
  'mutation($pullRequestId: ID!) { disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) { pullRequest { id } } }';

async function mutate(fetch: Fetch, request: Parameters<Fetch>): Promise<void> {
  dataOf(await bodyOf(fetch, request, 'Auto-merge'), invalidAutoMerge);
}

type Enable = { nodeId: string; method: MergeMethod; projectId: string };

const enableRequest = ({
  nodeId,
  method,
  projectId,
}: Enable): Parameters<Fetch> =>
  graphql(
    enableMutation,
    { pullRequestId: nodeId, mergeMethod: method },
    projectId,
  );

export const enableAutoMerge = (fetch: Fetch, enable: Enable): Promise<void> =>
  mutate(fetch, enableRequest(enable));

export const disableAutoMerge = (
  fetch: Fetch,
  { nodeId, projectId }: { nodeId: string; projectId: string },
): Promise<void> =>
  mutate(fetch, graphql(disableMutation, { pullRequestId: nodeId }, projectId));
