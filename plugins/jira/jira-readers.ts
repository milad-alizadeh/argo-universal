import { at, list, present, text, type Json } from './json';

// What the Plugin keeps of Jira's answers: its own JSON, so a named read can keep it and a page can draw it.
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

// One page of an offset-paged list, and where the next page starts, or null at the end.
export type OffsetPage<Item> = { items: Item[]; next: number | null };

export type JiraMyself = { accountId: string; name: string; email: string };

// Someone an issue in the project can be assigned to, for the assignee filter.
export type JiraPerson = { accountId: string; name: string };

type Read = Json | undefined;

const categories: readonly StatusCategory[] = ['new', 'indeterminate', 'done'];

const categoryOf = (value: Read): StatusCategory =>
  categories.find((category) => category === value) ?? 'indeterminate';

const textOr = (value: Read, fallback: string): string =>
  text(value) ?? fallback;

const statusOf = (fields: Read): JiraIssue['status'] => ({
  name: textOr(at(fields, 'status', 'name'), 'Unknown'),
  category: categoryOf(at(fields, 'status', 'statusCategory', 'key')),
});

function assigneeOf(fields: Read): JiraIssue['assignee'] {
  const accountId = text(at(fields, 'assignee', 'accountId'));

  if (!accountId) return null;

  return {
    accountId,
    name: textOr(at(fields, 'assignee', 'displayName'), 'Unknown'),
  };
}

const issueFields = (key: string, fields: Read): JiraIssue => ({
  key,
  summary: textOr(at(fields, 'summary'), ''),
  status: statusOf(fields),
  assignee: assigneeOf(fields),
  priority: text(at(fields, 'priority', 'name')),
});

function issueOf(json: Json): JiraIssue | null {
  const key = text(at(json, 'key'));

  return key ? issueFields(key, at(json, 'fields')) : null;
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

// Apps and integrations can be assignable too; the filter offers people.
function personOf(json: Json): JiraPerson | null {
  const accountId = text(at(json, 'accountId'));

  if (!accountId || at(json, 'accountType') === 'app') return null;

  return { accountId, name: textOr(at(json, 'displayName'), accountId) };
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
  people: (json: Read): JiraPerson[] =>
    list(json).map(personOf).filter(present),
  issues: (json: Read): IssuePage => ({
    issues: list(at(json, 'issues')).map(issueOf).filter(present),
    cursor: cursorOf(json),
  }),
};
