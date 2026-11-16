import type { FixtureIssue, FixtureToken } from './jira-data';

/*
 * The JQL clauses the Plugin's filters send, as the fixture Jira reads them: a status category by its id, an
 * assignee (the caller, nobody, or one account id), and words the summary holds every one of. The `project = `
 * clause before them is the route's to read. A clause the fixture cannot read is refused, as Jira refuses JQL it
 * cannot parse, so a wrong clause fails loudly instead of matching every issue.
 */
type Matches = (issue: FixtureIssue, who: FixtureToken) => boolean;

// Jira's fixed status category ids.
const categoryIds: Record<FixtureIssue['status']['category'], string> = {
  new: '2',
  indeterminate: '4',
  done: '3',
};

const unquoted = (value: string): string =>
  value.replaceAll('\\"', '"').replaceAll('\\\\', '\\');

const groupIn = (pattern: RegExp, clause: string): string | undefined =>
  pattern.exec(clause)?.groups?.value;

const valueIn = (pattern: RegExp, clause: string): string | null => {
  const found = groupIn(pattern, clause);

  return found === undefined ? null : unquoted(found);
};

const categoryIs =
  (id: string): Matches =>
  ({ status }) =>
    categoryIds[status.category] === id;

const assignedTo =
  (accountId: string): Matches =>
  ({ assignee }) =>
    assignee?.accountId === accountId;

const summaryHolds =
  (words: string): Matches =>
  ({ summary }) =>
    words
      .toLowerCase()
      .split(' ')
      .every((word) => summary.toLowerCase().includes(word));

const assignedToCaller: Matches = ({ assignee }, who) =>
  assignee?.accountId === who.accountId;

const unassigned: Matches = ({ assignee }) => assignee === null;

const fixed = new Map<string, Matches>([
  ['assignee = currentUser()', assignedToCaller],
  ['assignee is EMPTY', unassigned],
]);

const valued: [RegExp, (value: string) => Matches][] = [
  [/^statusCategory = (?<value>[234])$/u, categoryIs],
  [/^assignee = "(?<value>(?:[^"\\]|\\.)*)"$/u, assignedTo],
  [/^text ~ "(?<value>(?:[^"\\]|\\.)*)"$/u, summaryHolds],
];

const matchIn =
  (clause: string) =>
  ([pattern, matches]: (typeof valued)[number]): Matches | null => {
    const value = valueIn(pattern, clause);

    return value === null ? null : matches(value);
  };

const valuedMatch = (clause: string): Matches | null | undefined =>
  valued.map(matchIn(clause)).find((matches) => matches !== null);

const clauseMatch = (clause: string): Matches | undefined =>
  valuedMatch(clause) ?? fixed.get(clause);

// What the filters leave, or the first clause the fixture cannot read.
export type Filtered =
  | { ok: true; issues: FixtureIssue[] }
  | { ok: false; clause: string };

const clausesOf = (jql: string): string[] =>
  (jql.split(' ORDER BY ').at(0) ?? '').split(' AND ').slice(1);

const leaving = (
  matches: Matches[],
  issues: FixtureIssue[],
  who: FixtureToken,
): FixtureIssue[] =>
  issues.filter((issue) => matches.every((match) => match(issue, who)));

// What the filters after the project clause leave of its issues, for the person asking.
export function filtered(
  jql: string,
  issues: FixtureIssue[],
  who: FixtureToken,
): Filtered {
  const clauses = clausesOf(jql);
  const matches = clauses.map(clauseMatch);
  const unread = clauses.find((_, index) => matches[index] === undefined);

  return unread === undefined
    ? { ok: true, issues: leaving(matches.filter(present), issues, who) }
    : { ok: false, clause: unread };
}

const present = (match: Matches | undefined): match is Matches =>
  match !== undefined;
