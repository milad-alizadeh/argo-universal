import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { issueReaders, type JiraPriority } from './issue-readers';
import { issueRequests } from './issue-requests';
import { callJira, type JiraAnswer, type JiraCall } from './jira-client';
import {
  issueOf,
  type IssuePage,
  type JiraIssue,
  type JiraPerson,
} from './jira-readers';
import {
  borrowing,
  byProject,
  type IssuesTarget,
  type SiteTarget,
} from './read-scope';

/*
 * The reads one issue's page makes (ADR-0037): the issue, and the choices its menus offer. A search seeds the issue's
 * entry, and its list reads the choices, so an issue opened from its row draws at once.
 */
export type IssueTarget = SiteTarget & { key: string };

// What an issue's page offers to change it to: the site's priorities and the people its Jira project can assign.
export type EditChoices = { priorities: JiraPriority[]; people: JiraPerson[] };

export type IssueReads = Readonly<{
  issue: (args: IssueTarget) => NamedQuery<JiraAnswer<JiraIssue>>;
  // A choice Jira cannot list now is left out, so the page still offers the others.
  choices: (args: IssuesTarget) => NamedQuery<EditChoices>;
}>;

const orNone = <Value>(answer: JiraAnswer<Value[]>): Value[] =>
  answer.ok ? answer.value : [];

type Sent = Pick<JiraCall<never>, 'send' | 'cloudId'>;

type Asked<Value> = Pick<JiraCall<Value>, 'request' | 'read'>;

// One list a menu offers, or none when Jira cannot list it now.
const listed = async <Value>(
  sent: Sent,
  { request, read }: Asked<Value[]>,
): Promise<Value[]> => orNone(await callJira({ ...sent, request, read }));

const priorities: Asked<JiraPriority[]> = {
  request: issueRequests.priorities(),
  read: issueReaders.priorities,
};

const assignable = (projectKey: string): Asked<JiraPerson[]> => ({
  request: issueRequests.assignable(projectKey),
  read: issueReaders.assignable,
});

async function choicesOf(
  argo: Argo,
  { projectId, cloudId, projectKey }: IssuesTarget,
): Promise<EditChoices> {
  const sent = { send: borrowing(argo, projectId), cloudId };

  const [found, people] = await Promise.all([
    listed(sent, priorities),
    listed(sent, assignable(projectKey)),
  ]);

  return { priorities: found, people };
}

const issueRead = (argo: Argo): IssueReads['issue'] =>
  argo.queries.define(
    'issue',
    ({ projectId, cloudId, key }: IssueTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: issueRequests.issue(key),
        read: issueOf,
      }),
    byProject,
  );

export const defineIssueReads = (argo: Argo): IssueReads => ({
  issue: issueRead(argo),
  choices: argo.queries.define(
    'choices',
    (target: IssuesTarget) => choicesOf(argo, target),
    byProject,
  ),
});

// A search answers each issue in full, so it seeds the entry the issue's page reads, which then draws at once.
export async function seedIssues(
  argo: Argo,
  { issue }: IssueReads,
  { target, answer }: { target: SiteTarget; answer: JiraAnswer<IssuePage> },
): Promise<JiraAnswer<IssuePage>> {
  const issues = answer.ok ? answer.value.issues : [];

  const seed = (found: JiraIssue): Promise<void> =>
    argo.queries.seed(issue({ ...target, key: found.key }), {
      ok: true,
      value: found,
    });

  await Promise.all(issues.map(seed));

  return answer;
}
