import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { text, valueAt, type Json } from './json';
import {
  mergeMethods,
  type AutoMergeInfo,
  type MergeMethod,
  type MergeSettings,
} from './pull-automation';
import { dataOf, graphql, invalidAutoMerge } from './pull-graphql';
import { bodyOf, call, type PullTarget } from './pull-reads';

type Fetch = Argo['fetch'];

const autoMergeQuery =
  'query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { id autoMergeRequest { mergeMethod } } } }';

function parseAutoMerge(body: string): AutoMergeInfo {
  const data = dataOf(body, invalidAutoMerge);
  const pull = ['repository', 'pullRequest'];

  return {
    nodeId: text(data, invalidAutoMerge, ...pull, 'id'),
    on: valueAt(data, [...pull, 'autoMergeRequest']) !== null,
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

function autoMergeRequest({
  repository,
  number,
  projectId,
}: AutomationTarget): Parameters<Fetch> {
  const [owner, name] = repository.split('/');

  return graphql(
    autoMergeQuery,
    { owner: owner ?? '', name: name ?? '', number },
    projectId,
  );
}

export async function fetchAutoMerge(
  fetch: Fetch,
  target: AutomationTarget,
): Promise<AutoMergeInfo> {
  const subject = `${target.repository}#${target.number}`;

  return parseAutoMerge(await bodyOf(fetch, autoMergeRequest(target), subject));
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
