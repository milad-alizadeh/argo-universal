import { jiraApiUrl } from './atlassian';
import { filterClauses, noFilters, type IssueFilters } from './jira-filters';
import { at, list, parseJson, text, type Json } from './json';

/*
 * Jira Cloud's REST API v3, as the Plugin uses it: each call is a request, built here, and a reader that turns the
 * reply into the Plugin's own JSON. The transport is passed in, so a page's named read borrows the Account and the
 * sign-in check sends the pasted token. Add a call by adding a request and its reader.
 */
export type JiraRequest = Readonly<{
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Json;
}>;

// Why Jira gave no answer, in words the page shows; the kind decides the page's next step.
export type JiraFailure = Readonly<{
  kind: 'signed-out' | 'forbidden' | 'not-found' | 'rate-limited' | 'failed';
  message: string;
}>;

export type JiraAnswer<Value> =
  | { ok: true; value: Value }
  | { ok: false; failure: JiraFailure };

// What a fetch answers, as `argo.fetch` does: null when no Account answers the borrow.
export type JiraReply = Readonly<{ status: number; body: string }> | null;

export type JiraSend = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<JiraReply>;

export type JiraProject = { id: string; key: string; name: string };

export type StatusCategory = 'new' | 'indeterminate' | 'done';

export type JiraIssue = {
  key: string;
  summary: string;
  status: { name: string; category: StatusCategory };
  assignee: { accountId: string; name: string } | null;
  priority: string | null;
};

// One page of a search: its issues, and Jira's cursor for the next page, or null at the end.
export type IssuePage = { issues: JiraIssue[]; cursor: string | null };

export type JiraMyself = { accountId: string; name: string; email: string };

// Someone an issue in the project can be assigned to, for the assignee filter.
export type JiraPerson = { accountId: string; name: string };

// How many issues one page of the list reads; Jira answers at most this many and a cursor for the rest.
export const issuesPageSize = 50;

// How many people the assignee filter offers by name, beside Anyone, Me and Unassigned.
const peopleLimit = 50;

// The fields a list row shows; a detail page asks for more.
const rowFields = ['summary', 'status', 'assignee', 'priority'];

const quoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export const jiraRequests = {
  myself: (): JiraRequest => ({ path: '/myself' }),
  projects: (): JiraRequest => ({
    path: '/project/search?maxResults=100&orderBy=name',
  }),
  /*
   * A project's issues the filters leave, the most recently updated first: Jira's enhanced search, paged by
   * `nextPageToken`.
   */
  issues: (
    projectKey: string,
    page: {
      cursor?: string | null;
      limit?: number;
      filters?: IssueFilters;
    } = {},
  ): JiraRequest => ({
    path: '/search/jql',
    method: 'POST',
    body: {
      jql: [
        `project = ${quoted(projectKey)}`,
        ...filterClauses(page.filters ?? noFilters),
      ]
        .join(' AND ')
        .concat(' ORDER BY updated DESC'),
      fields: rowFields,
      maxResults: page.limit ?? issuesPageSize,
      ...(page.cursor ? { nextPageToken: page.cursor } : {}),
    },
  }),
  // The people an issue in the project can be assigned to.
  people: (projectKey: string): JiraRequest => ({
    path: `/user/assignable/search?project=${encodeURIComponent(projectKey)}&maxResults=${peopleLimit}`,
  }),
};

const categories: readonly StatusCategory[] = ['new', 'indeterminate', 'done'];

const categoryOf = (value: unknown): StatusCategory =>
  categories.find((category) => category === value) ?? 'indeterminate';

function assigneeOf(fields: unknown): JiraIssue['assignee'] {
  const accountId = text(at(fields, 'assignee', 'accountId'));

  if (!accountId) return null;

  return {
    accountId,
    name: text(at(fields, 'assignee', 'displayName')) ?? 'Unknown',
  };
}

function issueOf(json: unknown): JiraIssue | null {
  const key = text(at(json, 'key'));
  const fields = at(json, 'fields');

  if (!key) return null;

  return {
    key,
    summary: text(at(fields, 'summary')) ?? '',
    status: {
      name: text(at(fields, 'status', 'name')) ?? 'Unknown',
      category: categoryOf(at(fields, 'status', 'statusCategory', 'key')),
    },
    assignee: assigneeOf(fields),
    priority: text(at(fields, 'priority', 'name')),
  };
}

function personOf(json: unknown): JiraPerson | null {
  const accountId = text(at(json, 'accountId'));

  // Apps and integrations can be assignable too; the filter offers people.
  if (!accountId || at(json, 'accountType') === 'app') return null;

  return { accountId, name: text(at(json, 'displayName')) ?? accountId };
}

function projectOf(json: unknown): JiraProject | null {
  const id = text(at(json, 'id'));
  const key = text(at(json, 'key'));

  return id && key ? { id, key, name: text(at(json, 'name')) ?? key } : null;
}

const present = <Value>(value: Value | null): value is Value => value !== null;

export const jiraReaders = {
  myself: (json: unknown): JiraMyself | null => {
    const accountId = text(at(json, 'accountId'));

    if (!accountId) return null;

    return {
      accountId,
      name: text(at(json, 'displayName')) ?? accountId,
      email: text(at(json, 'emailAddress')) ?? '',
    };
  },
  projects: (json: unknown): JiraProject[] =>
    list(at(json, 'values')).map(projectOf).filter(present),
  people: (json: unknown): JiraPerson[] =>
    list(json).map(personOf).filter(present),
  issues: (json: unknown): IssuePage => ({
    issues: list(at(json, 'issues')).map(issueOf).filter(present),
    cursor:
      at(json, 'isLast') === true ? null : text(at(json, 'nextPageToken')),
  }),
};

// Jira's own words for a refusal, when its body has them.
function jiraReason(body: string): string | null {
  const json = parseJson(body);
  const messages = list(at(json, 'errorMessages')).map(text).filter(present);

  return messages[0] ?? text(at(json, 'message'));
}

const failures: Record<
  number,
  Omit<JiraFailure, 'message'> & { says: string }
> = {
  401: { kind: 'signed-out', says: 'Jira no longer accepts this sign-in.' },
  403: {
    kind: 'forbidden',
    says: 'Your Jira account or token doesn’t have permission for this.',
  },
  404: {
    kind: 'not-found',
    says: 'Jira couldn’t find this. It may have been deleted or moved.',
  },
};

/*
 * Refusals Jira words as something else: a search naming a project that is gone, or the person can no longer see, is a
 * 400 about the JQL; a scoped token without a scope the call needs is a 401, though the token itself is fine.
 */
const projectGone = /does not exist for the field 'project'/u;

const scopeMissing = /scope does not match/iu;

const goneProject: JiraFailure = {
  kind: 'not-found',
  message:
    'This Jira project is gone, or your Atlassian account can no longer see it. Choose another Jira project.',
};

const missingScope: JiraFailure = {
  kind: 'forbidden',
  message:
    'Your API token doesn’t have the scopes this needs. Create a token with the Jira scopes on the sign-in page, then sign in with it.',
};

// Jira's own words for a 429 name no next step.
const rateLimited: JiraFailure = {
  kind: 'rate-limited',
  message:
    'Jira is limiting how often Argo can ask right now. Try again in a minute.',
};

function reworded(status: number, reason: string | null): JiraFailure | null {
  if (status === 429) return rateLimited;

  if (status === 400 && reason && projectGone.test(reason)) return goneProject;

  if (status === 401 && reason && scopeMissing.test(reason))
    return missingScope;

  return null;
}

// A reply that is not a success, as the failure the page draws.
export function failureOf(reply: JiraReply): JiraFailure {
  if (!reply) return { kind: 'signed-out', message: 'Sign in to Jira.' };

  const known = failures[reply.status];
  const reason = jiraReason(reply.body);
  const named = reworded(reply.status, reason);

  if (named) return named;

  // Atlassian's own words for a refused sign-in name no next step.
  if (known?.kind === 'signed-out')
    return { kind: known.kind, message: known.says };

  if (known) return { kind: known.kind, message: reason ?? known.says };

  return {
    kind: 'failed',
    message: reason ?? `Jira answered ${reply.status}. Try again.`,
  };
}

const okStatus = (status: number): boolean => status >= 200 && status < 300;

const unreachable: JiraFailure = {
  kind: 'failed',
  message: 'Couldn’t reach Jira. Check your connection and try again.',
};

async function sent(
  send: JiraSend,
  url: string,
  request: JiraRequest,
): Promise<JiraReply | JiraFailure> {
  const method = request.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (request.body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    return await send(url, {
      method,
      headers,
      ...(request.body === undefined
        ? {}
        : { body: JSON.stringify(request.body) }),
    });
  } catch {
    return unreachable;
  }
}

const isFailure = (value: JiraReply | JiraFailure): value is JiraFailure =>
  value !== null && 'kind' in value;

/*
 * One call to one site's Jira: the reply read into the Plugin's JSON, or why there is none. Nothing throws, so a
 * named read keeps a failure as its answer and the page draws it.
 */
export async function callJira<Value>(
  send: JiraSend,
  cloudId: string,
  request: JiraRequest,
  read: (json: unknown) => Value | null,
): Promise<JiraAnswer<Value>> {
  const reply = await sent(send, jiraApiUrl(cloudId, request.path), request);

  if (isFailure(reply)) return { ok: false, failure: reply };

  if (!reply || !okStatus(reply.status))
    return { ok: false, failure: failureOf(reply) };

  const value = read(parseJson(reply.body));

  return value === null
    ? {
        ok: false,
        failure: {
          kind: 'failed',
          message: 'Jira answered something unexpected.',
        },
      }
    : { ok: true, value };
}
