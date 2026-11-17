import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { ada, grace, type FixtureIssue, type FixtureSite } from './jira-data';
import type { JiraCall } from './jira-routes';

// One issue a route answers for, found by the key in its path, with the key of the Jira project that holds it.
export type Found = { issue: FixtureIssue; projectKey: string };

export type IssueAnswer = (found: Found, call: JiraCall) => FixtureAnswer;

const notFound: FixtureAnswer = {
  status: 404,
  json: {
    errorMessages: [
      'Issue does not exist or you do not have permission to see it.',
    ],
    errors: {},
  },
};

export const refused = (message: string): FixtureAnswer => ({
  status: 400,
  json: { errorMessages: [message], errors: {} },
});

export const done: FixtureAnswer = { status: 204, text: '' };

export const peopleOf = (site: FixtureSite): FixtureSite['people'] =>
  site.people ?? [ada, grace];

function issueAt({ site, match }: JiraCall): Found | undefined {
  const key = decodeURIComponent(match.groups?.key ?? '');

  const all = site.projects.flatMap((project) =>
    project.issues.map((issue) => ({ issue, projectKey: project.key })),
  );

  return all.find(({ issue }) => issue.key === key);
}

// Answers for one issue, or Jira's 404 when the site has none by that key.
export const withIssue =
  (answer: IssueAnswer) =>
  (call: JiraCall): FixtureAnswer => {
    const found = issueAt(call);

    return found ? answer(found, call) : notFound;
  };
