import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import { callJira, type JiraAnswer, type JiraSend } from './jira-client';
import { jiraReaders, type IssuePage, type JiraProject } from './jira-readers';
import { jiraRequests } from './jira-requests';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
type Target = { projectId: string };

export type SiteTarget = Target & { cloudId: string };

type IssuesTarget = SiteTarget & { projectKey: string };

export type JiraReads = Readonly<{
  // The label of the Account the Project borrows, or null when it has none.
  account: (args: Target) => NamedQuery<string | null>;
  projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
  issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
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

const issuesRead = (argo: Argo): JiraReads['issues'] =>
  argo.queries.define(
    'issues',
    ({ projectId, cloudId, projectKey }: IssuesTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: jiraRequests.issues(projectKey),
        read: jiraReaders.issues,
      }),
    byProject,
  );

export const defineReads = (argo: Argo): JiraReads => ({
  account: accountRead(argo),
  projects: projectsRead(argo),
  issues: issuesRead(argo),
});
