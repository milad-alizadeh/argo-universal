import type { FixtureIssue, FixtureToken } from './jira-data';

/*
 * The JQL clauses the Plugin's filters send, as the fixture Jira reads them: a status category by name, an assignee
 * (the caller, nobody, or one account id), and words the summary holds every one of. The `project = ` clause before
 * them is the route's to read, and a clause the fixture does not know matches every issue.
 */
type Matches = (issue: FixtureIssue, who: FixtureToken) => boolean;

const categoryNames: Record<FixtureIssue['status']['category'], string> = {
  new: 'To Do',
  indeterminate: 'In Progress',
  done: 'Done',
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
  (name: string): Matches =>
  ({ status }) =>
    categoryNames[status.category] === name;

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
  [/^statusCategory = "(?<value>.*)"$/u, categoryIs],
  [/^assignee = "(?<value>.*)"$/u, assignedTo],
  [/^text ~ "(?<value>.*)"$/u, summaryHolds],
];

const everyIssue: Matches = () => true;

const matchIn =
  (clause: string) =>
  ([pattern, matches]: (typeof valued)[number]): Matches | null => {
    const value = valueIn(pattern, clause);

    return value === null ? null : matches(value);
  };

const valuedMatch = (clause: string): Matches | null | undefined =>
  valued.map(matchIn(clause)).find((matches) => matches !== null);

const clauseMatch = (clause: string): Matches =>
  valuedMatch(clause) ?? fixed.get(clause) ?? everyIssue;

// What the filters after the project clause leave of its issues, for the person asking.
export function filtered(
  jql: string,
  issues: FixtureIssue[],
  who: FixtureToken,
): FixtureIssue[] {
  const [where = ''] = jql.split(' ORDER BY ');
  const clauses = where.split(' AND ').slice(1).map(clauseMatch);

  return issues.filter((issue) =>
    clauses.every((matches) => matches(issue, who)),
  );
}
