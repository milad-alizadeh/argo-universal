import type { StatusCategory } from './jira-readers';

/*
 * How a person narrows a project's issues (Spec 0027): by status category, by who it is assigned to, and by text. The
 * filters are Page state, so they are part of the Page address: going back to the list shows the same filtered view,
 * and each filtered view keeps its own pages. Jira does the narrowing, as JQL clauses on the project's search.
 */
export type StatusFilter = 'all' | StatusCategory;

// `anyone`, `me`, `none` for unassigned, or one person's Atlassian account id.
export type AssigneeFilter = string;

export type IssueFilters = {
  status: StatusFilter;
  assignee: AssigneeFilter;
  text: string;
};

export const noFilters: IssueFilters = {
  status: 'all',
  assignee: 'anyone',
  text: '',
};

export const statusChoices: readonly { value: StatusFilter; label: string }[] =
  [
    { value: 'all', label: 'Any status' },
    { value: 'new', label: 'To Do' },
    { value: 'indeterminate', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

export const assigneeChoices: readonly {
  value: AssigneeFilter;
  label: string;
}[] = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'me', label: 'Me' },
  { value: 'none', label: 'Unassigned' },
];

// JQL names status categories by their English names, whatever language the site shows them in.
const categoryNames: Record<StatusCategory, string> = {
  new: 'To Do',
  indeterminate: 'In Progress',
  done: 'Done',
};

const quoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

// Characters Jira's text search reads as operators; a person typing them means the words around them.
const searchOperators = /[+\-&|!(){}[\]^~*?\\:"/]/gu;

// The words a text filter searches for, or '' when it has none.
export const searchText = (typed: string): string =>
  typed.replaceAll(searchOperators, ' ').replaceAll(/\s+/gu, ' ').trim();

function assigneeClause(assignee: AssigneeFilter): string | null {
  switch (assignee) {
    case 'anyone':
      return null;
    case 'me':
      return 'assignee = currentUser()';
    case 'none':
      return 'assignee is EMPTY';
    default:
      return `assignee = ${quoted(assignee)}`;
  }
}

// The JQL clauses the filters add to the project's search, in a fixed order so equal filters read the same Query.
export function filterClauses(filters: IssueFilters): string[] {
  const words = searchText(filters.text);
  const status =
    filters.status === 'all'
      ? null
      : `statusCategory = ${quoted(categoryNames[filters.status])}`;

  return [
    status,
    assigneeClause(filters.assignee),
    words ? `text ~ ${quoted(words)}` : null,
  ].filter((clause): clause is string => clause !== null);
}

// How many filters narrow the list, for the Filter menu's badge.
export const activeFilters = (filters: IssueFilters): number =>
  [
    filters.status !== 'all',
    filters.assignee !== 'anyone',
    searchText(filters.text) !== '',
  ].filter(Boolean).length;

const statusFilters = new Set<string>(
  statusChoices.map(({ value }) => value),
);

const isStatusFilter = (value: string): value is StatusFilter =>
  statusFilters.has(value);

// The filters a Page state holds; an address an older Plugin made, or a person edited, reads as no filter there.
export const filtersOf = (state: {
  status: string;
  assignee: string;
  text: string;
}): IssueFilters => ({
  status: isStatusFilter(state.status) ? state.status : 'all',
  assignee: state.assignee || 'anyone',
  text: state.text,
});
