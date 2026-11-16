import type { Argo } from '@argo/plugin-kit';
import { atlassianHost, issueUrl } from './atlassian';
import {
  callJira,
  jiraReaders,
  jiraRequests,
  type JiraAnswer,
  type JiraIssue,
  type JiraRequest,
  type JiraSend,
  type JiraStatus,
  type JiraTransition,
} from './jira-client';
import { siteFor } from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';

/*
 * The Operations that read and change one Jira issue (ADR-0044), which the issue's page runs and an Agent runs the
 * same way through `argo run`. Each finds the Project's site and Jira project as its page does, borrows the Project's
 * Account, and fails with Jira's reason, which the App shows as the error toast. Each write calls `argo.changed()`, so
 * every open list and page reads Jira again.
 */
type Calls = Pick<Argo, 'fetch' | 'storage' | 'changed' | 'operations'>;

type Located = { site: JiraSite; projectKey: string | null; send: JiraSend };

const listLimit = { fallback: 20, most: 100 };

// The site and Jira project the Project's Jira page shows, as its page finds them.
async function located(argo: Calls, projectId: string): Promise<Located> {
  const [sites, choice] = await Promise.all([
    argo.storage.batch(storeQueries.sites.queries),
    argo.storage.batch(storeQueries.choice(projectId).queries),
  ]);
  const chosen = storeReaders.choice(choice);
  const site = siteFor(storeReaders.sites(sites), chosen);

  if (!site)
    throw new Error(
      'Choose a Jira site for this Project first, on its Jira page.',
    );

  const projectKey =
    chosen.cloudId === site.cloudId ? (chosen.project?.key ?? null) : null;

  return {
    site,
    projectKey,
    send: (url, init) =>
      argo.fetch(url, { ...init, account: atlassianHost, projectId }),
  };
}

// The value Jira answered, or its reason as the Operation's error.
function answered<Value>(answer: JiraAnswer<Value>): Value {
  if (answer.ok) return answer.value;

  throw new Error(answer.failure.message);
}

const call = async <Value>(
  where: Located,
  request: JiraRequest,
  read: (json: unknown) => Value | null,
): Promise<Value> =>
  answered(await callJira(where.send, where.site.cloudId, request, read));

const same = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// A status is named by its id, as a board's column is, or by its name, as a person or an Agent writes it.
const isStatus = (status: JiraStatus, named: string): boolean =>
  status.id === named || same(status.name, named);

const transitionTo = (
  transitions: JiraTransition[],
  named: string,
): JiraTransition | undefined =>
  transitions.find(({ to }) => isStatus(to, named)) ??
  transitions.find(({ name }) => same(name, named));

const listed = (names: string[]): string =>
  names.length === 0
    ? 'Jira allows no move from there.'
    : `It can move to ${names.join(', ')}.`;

// Why Jira will not take the issue there, with where it can go instead.
function refusal(
  issue: JiraIssue,
  named: string,
  allowed: JiraTransition[],
): Error {
  const targets = [...new Set(allowed.map(({ to }) => to.name))];

  return new Error(
    `Jira doesn’t allow moving ${issue.key} from ${issue.status.name} to ${named}. ${listed(targets)}`,
  );
}

type IssueAt = { issue: string; projectId: string };

// Moves the issue to a status Jira allows from its current one; asking for the status it is in changes nothing.
async function transition(
  argo: Calls,
  { issue: key, status, projectId }: IssueAt & { status: string },
): Promise<{ issue: string; status: string }> {
  const where = await located(argo, projectId);
  const [issue, transitions] = await Promise.all([
    call(where, jiraRequests.issue(key), jiraReaders.issue),
    call(where, jiraRequests.transitions(key), jiraReaders.transitions),
  ]);
  const chosen = transitionTo(transitions, status);

  if (!chosen) {
    if (isStatus(issue.status, status))
      return { issue: issue.key, status: issue.status.name };

    throw refusal(issue, status, transitions);
  }

  await call(where, jiraRequests.transition(key, chosen.id), jiraReaders.done);
  argo.changed();

  return { issue: issue.key, status: chosen.to.name };
}

// `me` is whoever the Project's Account signs in as.
async function accountIdOf(
  where: Located,
  assignee: string | undefined,
): Promise<string | null> {
  if (!assignee) return null;

  if (!same(assignee, 'me')) return assignee;

  return (await call(where, jiraRequests.myself(), jiraReaders.myself))
    .accountId;
}

async function setAssignee(
  argo: Calls,
  { issue, assignee, projectId }: IssueAt & { assignee?: string },
): Promise<{ issue: string; assignee: string | null }> {
  const where = await located(argo, projectId);
  const accountId = await accountIdOf(where, assignee);

  await call(where, jiraRequests.assign(issue, accountId), jiraReaders.done);
  argo.changed();

  return { issue, assignee: accountId };
}

async function setPriority(
  argo: Calls,
  { issue, priority, projectId }: IssueAt & { priority: string },
): Promise<{ issue: string; priority: string }> {
  const where = await located(argo, projectId);
  const priorities = await call(
    where,
    jiraRequests.priorities(),
    jiraReaders.priorities,
  );
  const chosen = priorities.find(
    ({ id, name }) => id === priority || same(name, priority),
  );

  if (!chosen)
    throw new Error(
      `Jira has no priority called ${priority}. Its priorities are ${priorities.map(({ name }) => name).join(', ')}.`,
    );

  await call(
    where,
    jiraRequests.setPriority(issue, chosen.id),
    jiraReaders.done,
  );
  argo.changed();

  return { issue, priority: chosen.name };
}

// An issue as an Agent reads it: everything its page shows, and where it is in Jira.
const shared = (site: JiraSite, issue: JiraIssue) => ({
  key: issue.key,
  summary: issue.summary,
  status: issue.status.name,
  statusCategory: issue.status.category,
  assignee: issue.assignee,
  priority: issue.priority,
  labels: issue.labels,
  description: issue.description,
  // The statuses Jira allows `transition` to move it to now.
  movesTo: [...new Set(issue.transitions.map(({ to }) => to.name))],
  url: issueUrl(site.host, issue.key),
});

async function getIssue(argo: Calls, { issue, projectId }: IssueAt) {
  const where = await located(argo, projectId);

  return shared(
    where.site,
    await call(where, jiraRequests.issue(issue), jiraReaders.issue),
  );
}

const limitOf = (limit: number | undefined): number =>
  Math.min(
    Math.max(Math.trunc(limit ?? listLimit.fallback), 1),
    listLimit.most,
  );

async function listIssues(
  argo: Calls,
  {
    text,
    limit,
    projectId,
  }: { text?: string; limit?: number; projectId: string },
) {
  const where = await located(argo, projectId);

  if (!where.projectKey)
    throw new Error(
      'Choose a Jira project for this Project first, on its Jira page.',
    );

  const page = await call(
    where,
    jiraRequests.issues(where.projectKey, { limit: limitOf(limit), text }),
    jiraReaders.issues,
  );

  return {
    project: where.projectKey,
    issues: page.issues.map((issue) => {
      const { description: _description, ...row } = shared(where.site, issue);

      return row;
    }),
    more: page.cursor !== null,
  };
}

export function registerIssueOperations(argo: Calls): void {
  argo.operations.register('transition', (params, { projectId }) =>
    transition(argo, { ...params, projectId }),
  );
  argo.operations.register('setAssignee', (params, { projectId }) =>
    setAssignee(argo, { ...params, projectId }),
  );
  argo.operations.register('setPriority', (params, { projectId }) =>
    setPriority(argo, { ...params, projectId }),
  );
  argo.operations.register('getIssue', (params, { projectId }) =>
    getIssue(argo, { ...params, projectId }),
  );
  argo.operations.register('listIssues', (params, { projectId }) =>
    listIssues(argo, { ...params, projectId }),
  );
}
