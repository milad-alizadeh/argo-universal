import type { StatusCategory } from './jira-readers';

/*
 * How a person narrows a project's issues (Spec 0027): by status category, by who it is assigned to, and by text. The
 * filters are Page state, so they are part of the Page address: going back to the list shows the same filtered view,
 * and each filtered view keeps its own pages. Jira does the narrowing, as JQL clauses on the project's search.
 */
export type StatusFilter = 'all' | StatusCategory;

// The assignee is `anyone`, `me`, `none` for unassigned, or one person's Atlassian account id.
export type IssueFilters = {
  status: StatusFilter;
  assignee: string;
  text: string;
};

export const noFilters: IssueFilters = {
  status: 'all',
  assignee: 'anyone',
  text: '',
};

type Choice<Value extends string> = Readonly<{ value: Value; label: string }>;

export const statusChoices: readonly Choice<StatusFilter>[] = [
  { value: 'all', label: 'Any status' },
  { value: 'new', label: 'To Do' },
  { value: 'indeterminate', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const assigneeChoices: readonly Choice<string>[] = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'me', label: 'Me' },
  { value: 'none', label: 'Unassigned' },
];

// A JQL string literal.
export const quoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

/*
 * Status categories by Jira's fixed ids, which no site's language or renaming changes: 2 is To Do, 4 In Progress and
 * 3 Done.
 */
const statusClauses: Record<StatusFilter, string | null> = {
  all: null,
  new: 'statusCategory = 2',
  indeterminate: 'statusCategory = 4',
  done: 'statusCategory = 3',
};

// Anyone adds no clause; any other value is one person's account id.
const assigneeClauses = new Map<string, string | null>([
  ['anyone', null],
  ['me', 'assignee = currentUser()'],
  ['none', 'assignee is EMPTY'],
]);

const assigneeClause = (assignee: string): string | null =>
  assigneeClauses.has(assignee)
    ? (assigneeClauses.get(assignee) ?? null)
    : `assignee = ${quoted(assignee)}`;

/*
 * What Jira's text search reads as operators, characters and the words AND, OR and NOT; a person typing them means
 * the words around them.
 */
const searchOperators = /[+\-&|!(){}[\]^~*?\\:"/]|\b(?:AND|OR|NOT)\b/gu;

// The words a text filter searches for, or '' when it has none.
const searchText = (typed: string): string =>
  typed.replaceAll(searchOperators, ' ').replaceAll(/\s+/gu, ' ').trim();

const textClause = (typed: string): string | null => {
  const words = searchText(typed);

  return words ? `text ~ ${quoted(words)}` : null;
};

const present = (clause: string | null): clause is string => clause !== null;

// The JQL clauses the filters add to the project's search, in a fixed order so equal filters read the same Query.
export const filterClauses = (filters: IssueFilters): string[] =>
  [
    statusClauses[filters.status],
    assigneeClause(filters.assignee),
    textClause(filters.text),
  ].filter(present);

// How many filters narrow the list, the search's text among them.
export const activeFilters = (filters: IssueFilters): number =>
  filterClauses(filters).length;

// How many of the Filter menu's own choices narrow the list, for its badge; the search shows its text itself.
export const menuFilters = (filters: IssueFilters): number =>
  activeFilters({ ...filters, text: '' });

const statusFilters = new Set<string>(statusChoices.map(({ value }) => value));

const isStatusFilter = (value: string): value is StatusFilter =>
  statusFilters.has(value);

const statusOf = (value: string): StatusFilter =>
  isStatusFilter(value) ? value : 'all';

// The filters a Page state holds; a value no filter has, as in an edited address, reads as no filter there.
export const filtersOf = (state: IssueFilters): IssueFilters => ({
  status: statusOf(state.status),
  assignee: state.assignee || 'anyone',
  text: state.text,
});
