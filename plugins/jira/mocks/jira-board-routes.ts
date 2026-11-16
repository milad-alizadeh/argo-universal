import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { statuses } from './jira-issue-routes';
import type { JiraCall, JiraRoute } from './jira-service';

/*
 * The fixture Jira's project statuses, as `GET /project/<key>/statuses` answers them: one list per issue type. Jira
 * lists them in workflow order, which need not follow their categories, so here Done comes before In Review, and a
 * status two issue types share is listed under each.
 */
type Status = (typeof statuses)[keyof typeof statuses];

type StatusJson = {
  id: string;
  name: string;
  statusCategory: { key: Status['category'] };
};

const statusJson = (status: Status): StatusJson => ({
  id: status.id,
  name: status.name,
  statusCategory: { key: status.category },
});

export const projectStatuses = [
  {
    id: '10001',
    name: 'Task',
    subtask: false,
    statuses: [statuses.todo, statuses.doing, statuses.done].map(statusJson),
  },
  {
    id: '10002',
    name: 'Bug',
    subtask: false,
    statuses: [statuses.todo, statuses.done, statuses.review].map(statusJson),
  },
];

function projectStatusesOf({ site, match }: JiraCall): FixtureAnswer {
  const key = decodeURIComponent(match[1] ?? '');

  return site.projects.some((project) => project.key === key)
    ? { json: projectStatuses }
    : {
        status: 404,
        json: {
          errorMessages: [`No project could be found with key '${key}'.`],
        },
      };
}

export const boardRoutes: JiraRoute[] = [
  {
    name: 'statuses',
    method: 'GET',
    path: /^\/project\/([^/]+)\/statuses$/,
    answer: projectStatusesOf,
  },
];
