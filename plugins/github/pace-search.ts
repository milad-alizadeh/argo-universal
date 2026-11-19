import type { Argo } from '@argo/plugin-kit';
import { count, text, valueAt, type Json } from './json';
import type { Merge } from './pace-metrics';
import { dataOf, graphql } from './pull-graphql';
import { bodyOf } from './pull-reads';

export type Target = { projectId: string; repository: string; start: number };

type SearchVars = { search: string; after?: string };

type Fetch = Argo['fetch'];

const invalid = 'GitHub returned incomplete development data.';

const maximum = 1000;

const query = `query($search:String!,$after:String){
  search(query:$search,type:ISSUE,first:100,after:$after){
    issueCount pageInfo{hasNextPage endCursor}
    nodes{... on PullRequest{number title author{login} createdAt mergedAt}}
  }
}`;

const overview = `query($owner:String!,$name:String!,$drafts:String!){
 drafts:search(query:$drafts,type:ISSUE){issueCount}
 viewer{login} repository(owner:$owner,name:$name){
 defaultBranchRef{name} pullRequests(states:OPEN){totalCount}
 }}`;

async function request(
  fetch: Fetch,
  args: Parameters<typeof graphql>,
): Promise<Json> {
  return dataOf(
    await bodyOf(fetch, graphql(...args), 'Development pace'),
    invalid,
  );
}

export type Overview = {
  branch: string;
  viewer: string;
  open: number;
  drafts: number;
};

const draftCount = (data: Json): number =>
  count(valueAt(data, ['drafts']) ?? null, invalid, 'issueCount');

function overviewOf(data: Json): Overview {
  const branch = valueAt(data, ['repository', 'defaultBranchRef', 'name']);

  if (typeof branch !== 'string')
    throw new Error('This repository has no default branch yet.');

  return {
    branch,
    drafts: draftCount(data),
    viewer: text(data, invalid, 'viewer', 'login'),
    open: count(
      valueAt(data, ['repository', 'pullRequests']) ?? null,
      invalid,
      'totalCount',
    ),
  };
}

export async function readOverview(
  fetch: Fetch,
  target: Target,
): Promise<Overview> {
  const [owner = '', name = ''] = target.repository.split('/');

  const drafts = `repo:${target.repository} is:pr is:open draft:true`;

  const data = await request(fetch, [
    overview,
    { owner, name, drafts },
    target.projectId,
  ]);

  return overviewOf(data);
}

function timestamp(data: Json, field: string): number {
  const stamp = Date.parse(text(data, invalid, field));

  if (!Number.isFinite(stamp)) throw new Error(invalid);

  return stamp;
}

function pull(data: Json): Merge {
  const author = valueAt(data, ['author', 'login']);

  return {
    number: count(data, invalid, 'number'),
    title: text(data, invalid, 'title'),
    author: typeof author === 'string' ? author : null,
    merged: timestamp(data, 'mergedAt'),
    opened: timestamp(data, 'createdAt'),
  };
}

function checkedNodes(search: Json): Json[] {
  if (count(search, invalid, 'issueCount') > maximum)
    throw new Error('This period exceeds GitHub’s 1,000-result search limit.');
  const nodes = valueAt(search, ['nodes']);

  if (!Array.isArray(nodes)) throw new Error(invalid);

  return nodes;
}

type SearchPage = { pulls: Merge[]; after: string | null };

function page(data: Json): SearchPage {
  const search = valueAt(data, ['search']) ?? null;
  const nodes = checkedNodes(search);
  const more = valueAt(search, ['pageInfo', 'hasNextPage']);

  return {
    pulls: nodes.map(pull),
    after: more ? text(search, invalid, 'pageInfo', 'endCursor') : null,
  };
}

export async function readMerges(
  fetch: Fetch,
  target: Target,
  search: string,
): Promise<Merge[]> {
  const vars: SearchVars = { search };
  const pulls: Merge[] = [];

  for (;;) {
    const result = page(await request(fetch, [query, vars, target.projectId]));
    pulls.push(...result.pulls);

    if (!result.after) return pulls;
    vars.after = result.after;
  }
}
