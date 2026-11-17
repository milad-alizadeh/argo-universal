import type { Argo } from '@argo/plugin-kit';
import {
  accepted,
  answerOf,
  issueUrl,
  repositoryUrl,
  restRequest,
  type GitHubRequest,
} from './github-api';
import { labelColor, type IssueLabel, type IssueStatus } from './github-issues';
import { isObject, nonEmpty, pick, type Json } from './json';

type Fetch = Argo['fetch'];

type Target = { repository: string; projectId: string };

// What a person can put on an Issue: the repository's labels, in GitHub's colours, and the people it can be assigned to.
export type Choices = { labels: IssueLabel[]; assignees: string[] };

// GitHub's largest page.
const perPage = 100;

// GitHub's answer is what the code reads; anything else is refused, not skipped.
function entriesOf(answer: Json): Json[] {
  if (!Array.isArray(answer))
    throw new Error('GitHub returned an invalid list.');

  return answer;
}

function labelOf(entry: Json): IssueLabel {
  const name = nonEmpty(pick(entry, 'name'));
  const color = pick(entry, 'color');

  if (name === null) throw new Error('GitHub returned an invalid label.');

  return labelColor(name, typeof color === 'string' ? color : undefined);
}

function loginOf(entry: Json): string {
  const login = isObject(entry) ? nonEmpty(entry.login) : null;

  if (login === null) throw new Error('GitHub returned an invalid person.');

  return login;
}

// A person scrolls and searches a few hundred before they stop; past this many pages the rest is left out.
const maxPages = 10;

// One page of a list.
const pageOf = async (
  fetch: Fetch,
  projectId: string,
  { url, page }: { url: string; page: number },
): Promise<Json[]> => {
  const request = restRequest('GET', `${url}?per_page=${perPage}&page=${page}`);

  return entriesOf(await answerOf(fetch, projectId, request));
};

// Every page of a list GitHub has, up to the limit.
async function listOf(
  fetch: Fetch,
  projectId: string,
  url: string,
): Promise<Json[]> {
  const found: Json[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const entries = await pageOf(fetch, projectId, { url, page });

    found.push(...entries);

    if (entries.length < perPage) break;
  }

  return found;
}

export async function readChoices(
  fetch: Fetch,
  { repository, projectId }: Target,
): Promise<Choices> {
  const read = (list: 'labels' | 'assignees'): Promise<Json[]> =>
    listOf(fetch, projectId, `${repositoryUrl(repository)}/${list}`);

  const [labels, assignees] = await Promise.all([
    read('labels'),
    read('assignees'),
  ]);

  return { labels: labels.map(labelOf), assignees: assignees.map(loginOf) };
}

export type IssueEdit =
  | { kind: 'label'; name: string; on: boolean }
  | { kind: 'assignee'; login: string; on: boolean }
  | { kind: 'new-label'; name: string }
  | { kind: 'status'; status: IssueStatus };

// What GitHub's REST API takes for each status, with the reason it records.
const states = {
  open: { state: 'open', state_reason: 'reopened' },
  closed: { state: 'closed', state_reason: 'completed' },
} as const;

type Located = Target & { number: number };

const labelCalls = (
  url: string,
  name: string,
  on: boolean,
): GitHubRequest[] => [
  on
    ? restRequest('POST', `${url}/labels`, { labels: [name] })
    : restRequest('DELETE', `${url}/labels/${encodeURIComponent(name)}`),
];

const assigneeCalls = (
  url: string,
  login: string,
  on: boolean,
): GitHubRequest[] => [
  restRequest(on ? 'POST' : 'DELETE', `${url}/assignees`, {
    assignees: [login],
  }),
];

// A label that is not there yet is made first, then put on the Issue.
const newLabelCalls = (
  repository: string,
  url: string,
  name: string,
): GitHubRequest[] => [
  restRequest('POST', `${repositoryUrl(repository)}/labels`, { name }),
  ...labelCalls(url, name, true),
];

type Change = Exclude<IssueEdit, { kind: 'new-label' | 'status' }>;

const changeCalls = (url: string, edit: Change): GitHubRequest[] =>
  edit.kind === 'assignee'
    ? assigneeCalls(url, edit.login, edit.on)
    : labelCalls(url, edit.name, edit.on);

// Each edit as the calls GitHub takes for it.
const requestsOf = (
  { repository, number }: Located,
  edit: IssueEdit,
): GitHubRequest[] => {
  const url = issueUrl(repository, number);

  if (edit.kind === 'status')
    return [restRequest('PATCH', url, states[edit.status])];

  return edit.kind === 'new-label'
    ? newLabelCalls(repository, url, edit.name)
    : changeCalls(url, edit);
};

/*
 * Puts a label or a person on an Issue, takes them off, or closes or reopens it, as the signed-in person. The calls run in order, and the
 * first one GitHub refuses ends the edit with GitHub's own reason; Argo marks the Plugin's pages stale when the
 * Operation that calls this ends.
 */
export async function editIssue(
  fetch: Fetch,
  target: Located,
  edit: IssueEdit,
): Promise<void> {
  // A status change never read GitHub's answer, and still does not.
  const answer = edit.kind === 'status' ? accepted : answerOf;

  for (const request of requestsOf(target, edit))
    await answer(fetch, target.projectId, request);
}
