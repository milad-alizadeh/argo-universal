import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { valueAt, type Json } from './json';
import type { PullInfo } from './pull-info';
import { githubHost, bodyOf, call, type PullTarget } from './pull-reads';

// The merge methods GitHub names, in the order Auto-merge prefers them: squash, merge, rebase (ADR-0052).
export const mergeMethods = ['SQUASH', 'MERGE', 'REBASE'] as const;

export type MergeMethod = (typeof mergeMethods)[number];

// A pull request's auto-merge as GitHub reports it, and the id GraphQL names the pull request by; JSON all through.
export type AutoMergeInfo = { on: boolean; nodeId: string };

// What a repository allows: whether auto-merge is on at all, and which methods may merge.
export type MergeSettings = { allowed: boolean; methods: MergeMethod[] };

// One automation as the Change offers it.
export type AutomationState = {
  on: boolean;
  available: boolean;
  reason?: string;
};

export type AutomationOffer = {
  fix: AutomationState;
  merge: AutomationState;
  archive: AutomationState;
};

type Fetch = Argo['fetch'];

const invalidAutoMerge = 'GitHub returned an invalid auto-merge state.';

const invalidSettings = 'GitHub returned invalid merge settings.';

const autoMergeQuery =
  'query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { id autoMergeRequest { mergeMethod } } } }';

const enableMutation =
  'mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) { enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) { pullRequest { id } } }';

const disableMutation =
  'mutation($pullRequestId: ID!) { disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) { pullRequest { id } } }';

// GitHub's GraphQL endpoint on the Account's host: the only place the Plugin writes (ADR-0052).
const graphql = (
  query: string,
  variables: Record<string, string | number>,
  projectId: string,
): Parameters<Fetch> => [
  `https://${githubHost}/graphql`,
  {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    account: githubHost,
    projectId,
  },
];

// GraphQL answers 200 with `errors` when it refuses, so the reply is read before it is trusted.
function dataOf(body: string, invalid: string): Json {
  const reply: Json = JSON.parse(body);
  const errors = valueAt(reply, ['errors']);

  if (Array.isArray(errors) && errors.length > 0) {
    const message = valueAt(errors[0] ?? null, ['message']);

    throw new Error(typeof message === 'string' ? message : invalid);
  }

  const data = valueAt(reply, ['data']);

  if (data === undefined) throw new Error(invalid);

  return data;
}

function parseAutoMerge(body: string): AutoMergeInfo {
  const pull = valueAt(dataOf(body, invalidAutoMerge), [
    'repository',
    'pullRequest',
  ]);
  const id = pull === undefined ? undefined : valueAt(pull, ['id']);

  if (typeof id !== 'string' || id === '') throw new Error(invalidAutoMerge);

  return {
    nodeId: id,
    on: valueAt(pull ?? null, ['autoMergeRequest']) !== null,
  };
}

function methodsOf(repository: Json): MergeMethod[] {
  const allowed: Record<MergeMethod, string> = {
    SQUASH: 'allow_squash_merge',
    MERGE: 'allow_merge_commit',
    REBASE: 'allow_rebase_merge',
  };

  return mergeMethods.filter(
    (method) => valueAt(repository, [allowed[method]]) === true,
  );
}

function parseSettings(body: string): MergeSettings {
  const repository: Json = JSON.parse(body);
  const allowed = valueAt(repository, ['allow_auto_merge']);

  // GitHub leaves the field out for a person who cannot change the repository, which is read as not allowed.
  return { allowed: allowed === true, methods: methodsOf(repository) };
}

export type AutomationTarget = PullTarget;

export type SettingsTarget = { repository: string; projectId: string };

export async function fetchAutoMerge(
  fetch: Fetch,
  { repository, number, projectId }: AutomationTarget,
): Promise<AutoMergeInfo> {
  const [owner, name] = repository.split('/');

  return parseAutoMerge(
    await bodyOf(
      fetch,
      graphql(
        autoMergeQuery,
        { owner: owner ?? '', name: name ?? '', number },
        projectId,
      ),
      `${repository}#${number}`,
    ),
  );
}

export async function fetchMergeSettings(
  fetch: Fetch,
  { repository, projectId }: SettingsTarget,
): Promise<MergeSettings> {
  return parseSettings(
    await bodyOf(fetch, call(`/repos/${repository}`, projectId), repository),
  );
}

export type AutomationReads = {
  // The pull request's auto-merge, read through GraphQL, which also names the pull request for the mutations.
  autoMerge: (target: AutomationTarget) => NamedQuery<AutoMergeInfo>;
  // The repository's merge settings, shared by every pull request of the repository.
  mergeSettings: (target: SettingsTarget) => NamedQuery<MergeSettings>;
};

// Named reads like the pull request's own (ADR-0037): a failed read throws, so Argo keeps the last good answer.
export const defineAutomationReads = (argo: Argo): AutomationReads => ({
  autoMerge: argo.queries.define(
    'autoMerge',
    (target: AutomationTarget) => fetchAutoMerge(argo.fetch, target),
    { projectOf: ({ projectId }: AutomationTarget) => projectId },
  ),
  mergeSettings: argo.queries.define(
    'mergeSettings',
    (target: SettingsTarget) => fetchMergeSettings(argo.fetch, target),
    { projectOf: ({ projectId }: SettingsTarget) => projectId },
  ),
});

const notOpen = 'Only open pull requests can auto-merge';

const notAllowed = 'Not allowed in this repository';

const isDraft = "Draft pull requests can't auto-merge";

type Reads = { autoMerge?: AutoMergeInfo; settings?: MergeSettings };

/*
 * Auto-merge as the Change offers it. `on` is GitHub's own answer, never stored here. What GitHub has not told us is
 * never drawn as off: with either read unknown the item is unavailable with no reason, so the App draws nothing.
 */
export function mergeOf(
  pull: Pick<PullInfo, 'stage' | 'draft'>,
  { autoMerge, settings }: Reads,
): AutomationState {
  if (pull.stage !== 'open')
    return { on: false, available: false, reason: notOpen };

  if (!autoMerge || !settings) return { on: false, available: false };

  const { on } = autoMerge;

  if (!settings.allowed) return { on, available: false, reason: notAllowed };

  if (pull.draft) return { on, available: false, reason: isDraft };

  return { on, available: true };
}

const unoffered: AutomationState = { on: false, available: false };

// Auto-fix and Auto-archive arrive with their own tickets, so the menu draws only what works.
export const offerOf = (merge: AutomationState): AutomationOffer => ({
  fix: unoffered,
  merge,
  archive: unoffered,
});

// The first method the repository allows, in the order squash, merge, rebase.
export const methodOf = ({ methods }: MergeSettings): MergeMethod => {
  const [first] = methods;

  if (!first) throw new Error('This repository allows no merge method.');

  return first;
};

export async function enableAutoMerge(
  fetch: Fetch,
  {
    nodeId,
    method,
    projectId,
  }: { nodeId: string; method: MergeMethod; projectId: string },
): Promise<void> {
  dataOf(
    await bodyOf(
      fetch,
      graphql(
        enableMutation,
        { pullRequestId: nodeId, mergeMethod: method },
        projectId,
      ),
      'Auto-merge',
    ),
    invalidAutoMerge,
  );
}

export async function disableAutoMerge(
  fetch: Fetch,
  { nodeId, projectId }: { nodeId: string; projectId: string },
): Promise<void> {
  dataOf(
    await bodyOf(
      fetch,
      graphql(disableMutation, { pullRequestId: nodeId }, projectId),
      'Auto-merge',
    ),
    invalidAutoMerge,
  );
}
