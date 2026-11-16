import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import { ada, grace, type FixtureIssue, type FixtureSite } from './jira-data';
import type { JiraCall, JiraRoute } from './jira-routes';
import {
  issueJson,
  movesFrom,
  priorities,
  transitionsJson,
} from './jira-workflow';

/*
 * The fixture Jira's issue routes: one issue, its transitions, the site's priorities and assignable people, and the
 * writes the issue page makes. A write changes the fixture's data, so the next read shows it.
 */
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

const peopleOf = (site: FixtureSite): FixtureSite['people'] =>
  site.people ?? [ada, grace];

function issueAt({ site, match }: JiraCall): FixtureIssue | undefined {
  const key = decodeURIComponent(match.groups?.key ?? '');

  return site.projects
    .flatMap(({ issues }) => issues)
    .find((issue) => issue.key === key);
}

type IssueAnswer = (issue: FixtureIssue, call: JiraCall) => FixtureAnswer;

// Answers for one issue, or Jira's 404 when the site has none by that key.
const withIssue =
  (answer: IssueAnswer) =>
  (call: JiraCall): FixtureAnswer => {
    const issue = issueAt(call);

    return issue ? answer(issue, call) : notFound;
  };

const expandOf = ({ request }: JiraCall): string =>
  new URLSearchParams(request.path.split('?')[1] ?? '').get('expand') ?? '';

const shown: IssueAnswer = (issue, call) => ({
  json: issueJson(issue, expandOf(call)),
});

const transition: IssueAnswer = (issue, { body }) => {
  const id = text(at(body, 'transition', 'id'));
  const to = movesFrom(issue).find((status) => status.id === id);

  if (!to) return refused(`Transition id '${id}' is not valid for this issue.`);

  issue.status = { name: to.name, category: to.category };

  return done;
};

type Person = NonNullable<FixtureSite['people']>[number];

// No one unassigns; anyone else must be someone the site's projects may assign.
const assignable = (
  site: FixtureSite,
  accountId: Json | undefined,
): Person | null | undefined =>
  accountId === null
    ? null
    : peopleOf(site)?.find((one) => one.accountId === accountId);

const assign: IssueAnswer = (issue, { body, site }) => {
  const accountId = at(body, 'accountId');
  const found = assignable(site, accountId);

  if (found === undefined)
    return refused(`User '${text(accountId)}' cannot be assigned issues.`);

  issue.assignee = found;

  return done;
};

const edit: IssueAnswer = (issue, { body }) => {
  const id = text(at(body, 'fields', 'priority', 'id'));
  const priority = priorities.find((each) => each.id === id);

  if (!priority) return refused('The priority selected is invalid.');

  issue.priority = priority.name;

  return done;
};

const people = ({ site }: JiraCall): FixtureAnswer => ({
  json: (peopleOf(site) ?? []).map((one) => ({
    ...one,
    accountType: 'atlassian',
  })),
});

const key = '(?<key>[^/]+)';

// A route as `<METHOD> <path>`, over the path after `/rest/api/3`.
function route(
  name: string,
  call: string,
  answer: JiraRoute['answer'],
): JiraRoute {
  const [method = 'GET', path = ''] = call.split(' ');

  return { name, method, path: new RegExp(`^${path}$`), answer };
}

const transitionsOf = withIssue((issue) => ({
  json: { transitions: transitionsJson(issue) },
}));

export const issueRoutes: JiraRoute[] = [
  route('issue', `GET /issue/${key}`, withIssue(shown)),
  route('transitions', `GET /issue/${key}/transitions`, transitionsOf),
  route('transition', `POST /issue/${key}/transitions`, withIssue(transition)),
  route('assign', `PUT /issue/${key}/assignee`, withIssue(assign)),
  route('edit', `PUT /issue/${key}`, withIssue(edit)),
  route('priorities', 'GET /priority', () => ({ json: priorities })),
  route('assignable', 'GET /user/assignable/search', people),
];
