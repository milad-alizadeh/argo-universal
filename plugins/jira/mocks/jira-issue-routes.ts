import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import {
  grace,
  person,
  type FixtureIssue,
  type FixtureSite,
} from './jira-data';
import type { JiraCall, JiraRoute } from './jira-service';

/*
 * The fixture Jira's issue routes: one issue, its transitions, and the writes the issue page makes. Every project
 * shares one workflow, so To Do cannot go straight to Done, and every site the same priorities. A write changes the
 * fixture's data, so the next read shows it.
 */
type Category = FixtureIssue['status']['category'];

type Status = { id: string; name: string; category: Category };

export const statuses = {
  todo: { id: '1', name: 'To Do', category: 'new' },
  doing: { id: '3', name: 'In Progress', category: 'indeterminate' },
  review: { id: '4', name: 'In Review', category: 'indeterminate' },
  done: { id: '5', name: 'Done', category: 'done' },
} as const satisfies Record<string, Status>;

// Which statuses each status may move to, as Jira's workflow allows; the transition's id is its target's id.
const workflow: Record<string, Status[]> = {
  [statuses.todo.name]: [statuses.doing],
  [statuses.doing.name]: [statuses.todo, statuses.review, statuses.done],
  [statuses.review.name]: [statuses.doing, statuses.done],
  [statuses.done.name]: [statuses.todo],
};

export const priorities = [
  { id: '1', name: 'Highest' },
  { id: '2', name: 'High' },
  { id: '3', name: 'Medium' },
  { id: '4', name: 'Low' },
  { id: '5', name: 'Lowest' },
];

const ada = { accountId: person.accountId, displayName: person.displayName };

const peopleOf = (site: FixtureSite) => site.people ?? [ada, grace];

const statusOf = (issue: FixtureIssue): Status =>
  Object.values(statuses).find(({ name }) => name === issue.status.name) ?? {
    id: '0',
    ...issue.status,
  };

const statusJson = (status: Status) => ({
  id: status.id,
  name: status.name,
  statusCategory: { key: status.category },
});

const transitionsOf = (issue: FixtureIssue) =>
  (workflow[issue.status.name] ?? []).map((to) => ({
    id: to.id,
    name: to.name,
    isAvailable: true,
    to: statusJson(to),
  }));

// An issue as Jira answers it, with its transitions when the request expands them.
export const issueJson = (
  issue: FixtureIssue,
  index: number,
  expand: string,
) => ({
  id: String(10_000 + index),
  key: issue.key,
  fields: {
    summary: issue.summary,
    status: statusJson(statusOf(issue)),
    assignee: issue.assignee,
    priority: issue.priority
      ? {
          id: priorities.find(({ name }) => name === issue.priority)?.id,
          name: issue.priority,
        }
      : null,
    labels: issue.labels ?? [],
    description: issue.description ?? null,
  },
  ...(expand.split(',').includes('transitions')
    ? { transitions: transitionsOf(issue) }
    : {}),
});

const notFound: FixtureAnswer = {
  status: 404,
  json: {
    errorMessages: [
      'Issue does not exist or you do not have permission to see it.',
    ],
    errors: {},
  },
};

const refused = (message: string): FixtureAnswer => ({
  status: 400,
  json: { errorMessages: [message], errors: {} },
});

const done: FixtureAnswer = { status: 204, text: '' };

type Found = { issue: FixtureIssue; index: number };

function issueAt({ site, match }: JiraCall): Found | null {
  const key = decodeURIComponent(match[1] ?? '');

  for (const project of site.projects) {
    const index = project.issues.findIndex((issue) => issue.key === key);
    const issue = project.issues[index];

    if (issue) return { issue, index };
  }

  return null;
}

// Answers for one issue, or Jira's 404 when the site has none by that key.
const withIssue =
  (answer: (found: Found, call: JiraCall) => FixtureAnswer) =>
  (call: JiraCall): FixtureAnswer => {
    const found = issueAt(call);

    return found ? answer(found, call) : notFound;
  };

const field = (body: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>(
    (inner, key) =>
      typeof inner === 'object' && inner !== null
        ? Reflect.get(inner, key)
        : undefined,
    body,
  );

function transition({ issue }: Found, { body }: JiraCall): FixtureAnswer {
  const id = field(body, 'transition', 'id');
  const to = (workflow[issue.status.name] ?? []).find(
    (status) => status.id === id,
  );

  if (!to)
    return refused(
      `Transition id '${String(id)}' is not valid for this issue.`,
    );

  issue.status = { name: to.name, category: to.category };

  return done;
}

function assign({ issue }: Found, { body, site }: JiraCall): FixtureAnswer {
  const accountId = field(body, 'accountId');

  if (accountId === null) {
    issue.assignee = null;

    return done;
  }

  const found = peopleOf(site).find((one) => one.accountId === accountId);

  if (!found)
    return refused(`User '${String(accountId)}' cannot be assigned issues.`);

  issue.assignee = found;

  return done;
}

function edit({ issue }: Found, { body }: JiraCall): FixtureAnswer {
  const id = field(body, 'fields', 'priority', 'id');
  const priority = priorities.find((each) => each.id === id);

  if (!priority) return refused(`The priority selected is invalid.`);

  issue.priority = priority.name;

  return done;
}

const key = '([^/]+)';

export const issueRoutes: JiraRoute[] = [
  {
    name: 'issue',
    method: 'GET',
    path: new RegExp(`^/issue/${key}$`),
    answer: withIssue(({ issue, index }, { query }) => ({
      json: issueJson(issue, index, query.get('expand') ?? ''),
    })),
  },
  {
    name: 'transitions',
    method: 'GET',
    path: new RegExp(`^/issue/${key}/transitions$`),
    answer: withIssue(({ issue }) => ({
      json: { transitions: transitionsOf(issue) },
    })),
  },
  {
    name: 'transition',
    method: 'POST',
    path: new RegExp(`^/issue/${key}/transitions$`),
    answer: withIssue(transition),
  },
  {
    name: 'assign',
    method: 'PUT',
    path: new RegExp(`^/issue/${key}/assignee$`),
    answer: withIssue(assign),
  },
  {
    name: 'edit',
    method: 'PUT',
    path: new RegExp(`^/issue/${key}$`),
    answer: withIssue(edit),
  },
  {
    name: 'priorities',
    method: 'GET',
    path: /^\/priority$/,
    answer: () => ({ json: priorities }),
  },
  {
    name: 'assignable',
    method: 'GET',
    path: /^\/user\/assignable\/search$/,
    answer: ({ site }) => ({
      json: peopleOf(site).map((one) => ({
        ...one,
        accountType: 'atlassian',
        active: true,
      })),
    }),
  },
];
