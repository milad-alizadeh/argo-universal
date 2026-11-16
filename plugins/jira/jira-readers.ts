import {
  issueExtras,
  statusOf,
  type IssueExtras,
  type JiraStatus,
} from './issue-fields';
import { at, list, present, text, type Json } from './json';

// What the Plugin keeps of Jira's answers: its own JSON, so a named read can keep it and a page can draw it.
export type JiraProject = { id: string; key: string; name: string };

export type { StatusCategory } from './issue-fields';

export type JiraPerson = { accountId: string; name: string };

// An issue as a search or a read answers it: what its row shows, and what its page shows besides (`issue-fields.ts`).
export type JiraIssue = IssueExtras & {
  key: string;
  summary: string;
  status: JiraStatus;
  assignee: JiraPerson | null;
  priority: string | null;
};

// One page of a search: its issues, and Jira's cursor for the next page, or null at the end.
export type IssuePage = { issues: JiraIssue[]; cursor: string | null };

// One page of an offset-paged list, and where the next page starts, or null at the end.
export type OffsetPage<Item> = { items: Item[]; next: number | null };

export type JiraMyself = { accountId: string; name: string; email: string };

type Read = Json | undefined;

const textOr = (value: Read, fallback: string): string =>
  text(value) ?? fallback;

function assigneeOf(fields: Read): JiraIssue['assignee'] {
  const accountId = text(at(fields, 'assignee', 'accountId'));

  if (!accountId) return null;

  return {
    accountId,
    name: textOr(at(fields, 'assignee', 'displayName'), 'Unknown'),
  };
}

const issueFields = (
  key: string,
  fields: Read,
): Omit<JiraIssue, keyof IssueExtras> => ({
  key,
  summary: textOr(at(fields, 'summary'), ''),
  status: statusOf(at(fields, 'status')),
  assignee: assigneeOf(fields),
  priority: text(at(fields, 'priority', 'name')),
});

export function issueOf(json: Read): JiraIssue | null {
  const key = text(at(json, 'key'));

  return key
    ? { ...issueFields(key, at(json, 'fields')), ...issueExtras(json) }
    : null;
}

function projectOf(json: Json): JiraProject | null {
  const id = text(at(json, 'id'));
  const key = text(at(json, 'key'));

  if (!id || !key) return null;

  return { id, key, name: textOr(at(json, 'name'), key) };
}

function myselfOf(json: Read): JiraMyself | null {
  const accountId = text(at(json, 'accountId'));

  if (!accountId) return null;

  return {
    accountId,
    name: textOr(at(json, 'displayName'), accountId),
    email: textOr(at(json, 'emailAddress'), ''),
  };
}

const numberOr = (value: Read, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

// An empty page ends the list too, so a reply that never says `isLast` cannot page forever.
function nextStart(json: Read, count: number): number | null {
  if (count === 0 || at(json, 'isLast') === true) return null;

  return numberOr(at(json, 'startAt'), 0) + count;
}

const cursorOf = (json: Read): string | null =>
  at(json, 'isLast') === true ? null : text(at(json, 'nextPageToken'));

// Each reader answers null for a reply it cannot read, which the client reports as unexpected.
export const jiraReaders = {
  myself: myselfOf,
  projects: (json: Read): OffsetPage<JiraProject> => {
    const items = list(at(json, 'values')).map(projectOf).filter(present);

    return { items, next: nextStart(json, items.length) };
  },
  issues: (json: Read): IssuePage => ({
    issues: list(at(json, 'issues')).map(issueOf).filter(present),
    cursor: cursorOf(json),
  }),
};
