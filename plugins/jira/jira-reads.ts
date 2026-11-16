import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import { defineIssueReads, seedIssues, type IssueReads } from './issue-reads';
import { callJira, type JiraAnswer } from './jira-client';
import { jiraReaders, type IssuePage, type JiraProject } from './jira-readers';
import { jiraRequests } from './jira-requests';
import {
  borrowing,
  byProject,
  type IssuesTarget,
  type SiteTarget,
  type Target,
} from './read-scope';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
export type { SiteTarget } from './read-scope';

export type JiraReads = IssueReads &
  Readonly<{
    // The label of the Account the Project borrows, or null when it has none.
    account: (args: Target) => NamedQuery<string | null>;
    projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
    issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
  }>;

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

const issuesRead = (argo: Argo, seeds: IssueReads): JiraReads['issues'] =>
  argo.queries.define(
    'issues',
    async ({ projectId, cloudId, projectKey }: IssuesTarget) =>
      seedIssues(argo, seeds, {
        target: { projectId, cloudId },
        answer: await callJira({
          send: borrowing(argo, projectId),
          cloudId,
          request: jiraRequests.issues(projectKey),
          read: jiraReaders.issues,
        }),
      }),
    byProject,
  );

export function defineReads(argo: Argo): JiraReads {
  const issueReads = defineIssueReads(argo);

  return {
    ...issueReads,
    account: accountRead(argo),
    projects: projectsRead(argo),
    issues: issuesRead(argo, issueReads),
  };
}
