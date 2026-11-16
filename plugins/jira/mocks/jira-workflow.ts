import type { Json } from '../json';
import type { FixtureIssue } from './jira-data';

/*
 * The fixture Jira's workflow and priorities, and an issue as Jira answers it. Every project shares one workflow, so
 * To Do cannot go straight to Done; a transition's id is the id of the status it leads to.
 */
type Status = Readonly<{
  id: string;
  name: string;
  category: FixtureIssue['status']['category'];
}>;

export const statuses = {
  todo: { id: '1', name: 'To Do', category: 'new' },
  doing: { id: '3', name: 'In Progress', category: 'indeterminate' },
  review: { id: '4', name: 'In Review', category: 'indeterminate' },
  done: { id: '5', name: 'Done', category: 'done' },
} as const satisfies Record<string, Status>;

const { todo, doing, review, done } = statuses;

const workflow = new Map<string, Status[]>([
  [todo.name, [doing]],
  [doing.name, [todo, review, done]],
  [review.name, [doing, done]],
  [done.name, [todo]],
]);

/*
 * A global transition, "Any status → In Progress", as real Jira workflows have: Jira lists it on every issue, even one
 * already in In Progress, so a reader must not offer an issue's own status as a move.
 */
const fromAnyStatus: Status[] = [doing];

const once = (moves: Status[]): Status[] => [...new Set(moves)];

// Where an issue may move from the status it is in.
export const movesFrom = (issue: FixtureIssue): Status[] =>
  once([...(workflow.get(issue.status.name) ?? []), ...fromAnyStatus]);

export const priorities = [
  { id: '1', name: 'Highest' },
  { id: '2', name: 'High' },
  { id: '3', name: 'Medium' },
  { id: '4', name: 'Low' },
  { id: '5', name: 'Lowest' },
];

const statusOf = ({ status }: FixtureIssue): Status =>
  Object.values(statuses).find(({ name }) => name === status.name) ?? {
    id: '0',
    ...status,
  };

const statusJson = ({ id, name, category }: Status): Json => ({
  id,
  name,
  statusCategory: { key: category },
});

export const transitionsJson = (issue: FixtureIssue): Json =>
  movesFrom(issue).map((to) => ({
    id: to.id,
    name: to.name,
    isAvailable: true,
    to: statusJson(to),
  }));

const priorityJson = ({ priority }: FixtureIssue): Json => {
  const found = priorities.find(({ name }) => name === priority);

  return found ?? null;
};

const fieldsJson = (issue: FixtureIssue): Json => ({
  summary: issue.summary,
  status: statusJson(statusOf(issue)),
  assignee: issue.assignee,
  priority: priorityJson(issue),
  labels: issue.labels ?? [],
  description: issue.description ?? null,
});

// An issue as Jira answers it, with its transitions when the request expands them.
export function issueJson(issue: FixtureIssue, expand: string): Json {
  const json = { key: issue.key, fields: fieldsJson(issue) };

  return expand.split(',').includes('transitions')
    ? { ...json, transitions: transitionsJson(issue) }
    : json;
}
