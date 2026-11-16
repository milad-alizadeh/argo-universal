import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import { callJira, type JiraAnswer, type JiraSend } from './jira-client';
import type { IssueFilters } from './jira-filters';
import {
  jiraReaders,
  type IssuePage,
  type JiraPerson,
  type JiraProject,
} from './jira-readers';
import { jiraRequests } from './jira-requests';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
type Target = { projectId: string };

export type SiteTarget = Target & { cloudId: string };

export type ProjectTarget = SiteTarget & { projectKey: string };

// One page of the filtered list: the first from a null cursor, each after it from the cursor the one before answered.
export type IssuesTarget = ProjectTarget & {
  filters: IssueFilters;
  cursor: string | null;
};

export type JiraReads = Readonly<{
  // The label of the Account the Project borrows, or null when it has none.
  account: (args: Target) => NamedQuery<string | null>;
  projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
  issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
  people: (args: ProjectTarget) => NamedQuery<JiraAnswer<JiraPerson[]>>;
}>;

const byProject = { projectOf: ({ projectId }: Target): string => projectId };

// `argo.fetch` as the Project's Account, which Argo sets the `Authorization` header for.
const borrowing =
  (argo: Pick<Argo, 'fetch'>, projectId: string): JiraSend =>
  (url, init) =>
    argo.fetch(url, { ...init, account: atlassianHost, projectId });

const accountRead = (argo: Argo): JiraReads['account'] =>
  argo.queries.define(
    'account',
    async (_args: Target) =>
      (await argo.accounts.get(atlassianHost))?.label ?? null,
    byProject,
  );

const projectsRead = (argo: Argo): JiraReads['projects'] =>
  argo.queries.define(
    'projects',
    ({ projectId, cloudId }: SiteTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: jiraRequests.projects(),
        read: jiraReaders.projects,
      }),
    byProject,
  );

/*
 * The first page's failure is an answer, which the page draws in the list's place. A later page's has nowhere to be
 * drawn but the load more that asked for it, so it fails that read, which keeps no answer and is read again on the
 * next load more.
 */
function laterPageRead(
  { cursor }: IssuesTarget,
  answer: JiraAnswer<IssuePage>,
): JiraAnswer<IssuePage> {
  if (cursor !== null && !answer.ok) throw new Error(answer.failure.message);

  return answer;
}

const issuesRead = (argo: Argo): JiraReads['issues'] =>
  argo.queries.define(
    'issues',
    async (target: IssuesTarget) =>
      laterPageRead(
        target,
        await callJira({
          send: borrowing(argo, target.projectId),
          cloudId: target.cloudId,
          request: jiraRequests.issues(target.projectKey, target),
          read: jiraReaders.issues,
        }),
      ),
    byProject,
  );

const peopleRead = (argo: Argo): JiraReads['people'] =>
  argo.queries.define(
    'people',
    ({ projectId, cloudId, projectKey }: ProjectTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: jiraRequests.people(projectKey),
        read: jiraReaders.people,
      }),
    byProject,
  );

export const defineReads = (argo: Argo): JiraReads => ({
  account: accountRead(argo),
  projects: projectsRead(argo),
  issues: issuesRead(argo),
  people: peopleRead(argo),
});
