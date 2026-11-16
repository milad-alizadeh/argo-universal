import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { peopleOf, withIssue, type IssueAnswer } from './jira-issue-found';
import { issueJson, transitionsJson, type Asked } from './jira-issue-json';
import { assign, edit, transition } from './jira-issue-writes';
import type { JiraCall, JiraRoute } from './jira-routes';
import { priorities } from './jira-workflow';

/*
 * The fixture Jira's issue routes: one issue, its transitions, the site's priorities and assignable people, and the
 * writes the issue page makes (`jira-issue-writes.ts`). A write changes the fixture's data, so the next read shows it.
 */
const queryOf = ({ request }: JiraCall): URLSearchParams =>
  new URLSearchParams(request.path.split('?')[1] ?? '');

// The fields and expansions a read names in its query; none named answers every field, as Jira does.
function askedOf(call: JiraCall): Asked {
  const query = queryOf(call);
  const fields = query.get('fields');

  return {
    fields: fields ? fields.split(',') : null,
    expand: query.get('expand') ?? '',
  };
}

const shown: IssueAnswer = ({ issue, projectKey }, call) => ({
  json: issueJson(issue, projectKey, askedOf(call)),
});

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

const transitionsOf = withIssue(({ issue }) => ({
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
