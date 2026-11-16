import type { FixtureIssue } from './jira-data';

/*
 * The fixture Jira's workflow and priorities. Every project shares one workflow, so To Do cannot go straight to Done.
 * As in real Jira, a transition has its own id (11, 21, 31…), not the id of the status it leads to. In Review also
 * lists what Jira lists that a menu must not offer: a looped transition back to In Review, one whose conditions fail
 * (`isAvailable: false`), and a second transition to Done.
 */
type Status = Readonly<{
  id: string;
  name: string;
  category: FixtureIssue['status']['category'];
}>;

export type Transition = Readonly<{
  id: string;
  name: string;
  to: Status;
  isAvailable: boolean;
}>;

export const statuses = {
  todo: { id: '1', name: 'To Do', category: 'new' },
  doing: { id: '3', name: 'In Progress', category: 'indeterminate' },
  review: { id: '4', name: 'In Review', category: 'indeterminate' },
  done: { id: '5', name: 'Done', category: 'done' },
} as const satisfies Record<string, Status>;

const { todo, doing, review, done } = statuses;

const move = (id: string, name: string, to: Status): Transition => ({
  id,
  name,
  to,
  isAvailable: true,
});

// The transitions a test presses, by the status each leads to.
export const transitions = {
  stop: move('11', 'Stop progress', todo),
  start: move('21', 'Start progress', doing),
  review: move('31', 'Request review', review),
  finish: move('41', 'Done', done),
  approve: move('51', 'Approve', done),
  comment: move('61', 'Comment', review),
  reject: { ...move('71', 'Reject', todo), isAvailable: false },
} as const;

const { stop, start, finish, approve, comment, reject } = transitions;

const workflow = new Map<string, Transition[]>([
  [todo.name, [start]],
  [doing.name, [stop, transitions.review, finish]],
  [review.name, [start, approve, finish, comment, reject]],
  [done.name, [{ ...stop, name: 'Reopen' }]],
]);

/*
 * A global transition, "Any status → In Progress", as real Jira workflows have: Jira lists it on every issue, even one
 * already in In Progress, so a reader must not offer an issue's own status as a move.
 */
const fromAnyStatus = move('81', 'Back to work', doing);

// The transitions Jira lists from the status an issue is in, the global one last.
export const transitionsFrom = (issue: FixtureIssue): Transition[] => [
  ...(workflow.get(issue.status.name) ?? []),
  fromAnyStatus,
];

export const statusOf = ({ status }: FixtureIssue): Status =>
  Object.values(statuses).find(({ name }) => name === status.name) ?? {
    id: '0',
    ...status,
  };

export const priorities = [
  { id: '1', name: 'Highest' },
  { id: '2', name: 'High' },
  { id: '3', name: 'Medium' },
  { id: '4', name: 'Low' },
  { id: '5', name: 'Lowest' },
];
