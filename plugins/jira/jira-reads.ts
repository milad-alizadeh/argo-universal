import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import {
  callJira,
  jiraReaders,
  jiraRequests,
  type IssuePage,
  type JiraAnswer,
  type JiraIssue,
  type JiraPerson,
  type JiraPriority,
  type JiraProject,
  type JiraSend,
} from './jira-client';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
type Target = { projectId: string };

type SiteTarget = Target & { cloudId: string };

type IssuesTarget = SiteTarget & { projectKey: string };

type IssueTarget = SiteTarget & { key: string };

// What an issue's page offers to change it to: the site's priorities and the people its Jira project can assign.
export type EditChoices = { priorities: JiraPriority[]; people: JiraPerson[] };

export type JiraReads = Readonly<{
  // The label of the Account the Project borrows, or null when it has none.
  account: (args: Target) => NamedQuery<string | null>;
  projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
  issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
  // One issue, as its page shows it; a search seeds it for each issue it lists.
  issue: (args: IssueTarget) => NamedQuery<JiraAnswer<JiraIssue>>;
  // A choice Jira cannot list now is left out, so the page still offers the others.
  choices: (args: IssuesTarget) => NamedQuery<EditChoices>;
}>;

const byProject = { projectOf: ({ projectId }: Target): string => projectId };

// `argo.fetch` as the Project's Account, which Argo sets the `Authorization` header for.
const borrowing =
  (argo: Pick<Argo, 'fetch'>, projectId: string): JiraSend =>
  (url, init) =>
    argo.fetch(url, { ...init, account: atlassianHost, projectId });

// What a call answers, or nothing when it fails.
const orNone = <Value>(answer: JiraAnswer<Value[]>): Value[] =>
  answer.ok ? answer.value : [];

function choicesRead(argo: Argo): JiraReads['choices'] {
  return argo.queries.define(
    'choices',
    async ({ projectId, cloudId, projectKey }: IssuesTarget) => {
      const send = borrowing(argo, projectId);
      const [priorities, people] = await Promise.all([
        callJira(
          send,
          cloudId,
          jiraRequests.priorities(),
          jiraReaders.priorities,
        ),
        callJira(
          send,
          cloudId,
          jiraRequests.assignable(projectKey),
          jiraReaders.assignable,
        ),
      ]);

      return { priorities: orNone(priorities), people: orNone(people) };
    },
    byProject,
  );
}

function issueRead(argo: Argo): JiraReads['issue'] {
  return argo.queries.define(
    'issue',
    ({ projectId, cloudId, key }: IssueTarget) =>
      callJira(
        borrowing(argo, projectId),
        cloudId,
        jiraRequests.issue(key),
        jiraReaders.issue,
      ),
    byProject,
  );
}

// A search answers each issue in full, so it seeds the entry the issue's page reads, which then draws at once.
async function seeded(
  argo: Argo,
  issue: JiraReads['issue'],
  target: IssuesTarget,
  answer: JiraAnswer<IssuePage>,
): Promise<JiraAnswer<IssuePage>> {
  if (!answer.ok) return answer;

  const { projectId, cloudId } = target;

  await Promise.all(
    answer.value.issues.map((found) =>
      argo.queries.seed(issue({ projectId, cloudId, key: found.key }), {
        ok: true,
        value: found,
      }),
    ),
  );

  return answer;
}

export function defineReads(argo: Argo): JiraReads {
  const issue = issueRead(argo);

  return {
    issue,
    choices: choicesRead(argo),
    account: argo.queries.define(
      'account',
      async (_args: Target) =>
        (await argo.accounts.get(atlassianHost))?.label ?? null,
      byProject,
    ),
    projects: argo.queries.define(
      'projects',
      ({ projectId, cloudId }: SiteTarget) =>
        callJira(
          borrowing(argo, projectId),
          cloudId,
          jiraRequests.projects(),
          jiraReaders.projects,
        ),
      byProject,
    ),
    issues: argo.queries.define(
      'issues',
      async (target: IssuesTarget) =>
        seeded(
          argo,
          issue,
          target,
          await callJira(
            borrowing(argo, target.projectId),
            target.cloudId,
            jiraRequests.issues(target.projectKey),
            jiraReaders.issues,
          ),
        ),
      byProject,
    ),
  };
}
