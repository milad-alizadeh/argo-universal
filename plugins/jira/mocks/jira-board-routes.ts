import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import type { Json } from '../json';
import type { JiraCall, JiraRoute } from './jira-routes';
import { statuses } from './jira-workflow';

/*
 * The fixture Jira's project statuses, as `GET /project/<key>/statuses` answers them: one list per issue type. Jira
 * lists them in workflow order, which need not follow their categories, so here Done comes before In Review, and a
 * status two issue types share is listed under each.
 */
type Status = (typeof statuses)[keyof typeof statuses];

const statusJson = ({ id, name, category }: Status): Json => ({
  id,
  name,
  statusCategory: { key: category },
});

const { todo, doing, review, done } = statuses;

const issueType = (id: string, name: string, shown: Status[]): Json => ({
  id,
  name,
  subtask: false,
  statuses: shown.map(statusJson),
});

const projectStatuses: Json = [
  issueType('10001', 'Task', [todo, doing, done]),
  issueType('10002', 'Bug', [todo, done, review]),
];

const noSuchProject = (key: string): FixtureAnswer => ({
  status: 404,
  json: { errorMessages: [`No project could be found with key '${key}'.`] },
});

const keyOf = ({ groups }: RegExpExecArray): string =>
  decodeURIComponent(groups?.key ?? '');

function projectStatusesOf({ site, match }: JiraCall): FixtureAnswer {
  const key = keyOf(match);
  const known = site.projects.some((project) => project.key === key);

  return known ? { json: projectStatuses } : noSuchProject(key);
}

export const boardRoutes: JiraRoute[] = [
  {
    name: 'statuses',
    method: 'GET',
    path: /^\/project\/(?<key>[^/]+)\/statuses$/,
    answer: projectStatusesOf,
  },
];
