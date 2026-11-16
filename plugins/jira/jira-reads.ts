import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import {
  callJira,
  jiraReaders,
  jiraRequests,
  type IssuePage,
  type JiraAnswer,
  type JiraPerson,
  type JiraProject,
  type JiraSend,
} from './jira-client';
import type { IssueFilters } from './jira-filters';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
type Target = { projectId: string };

type SiteTarget = Target & { cloudId: string };

type JiraProjectTarget = SiteTarget & { projectKey: string };

// One page of the filtered list: the first from a null cursor, each after it from the cursor the one before answered.
type IssuesTarget = JiraProjectTarget & {
  filters: IssueFilters;
  cursor: string | null;
};

/*
 * A page after the first that Jira refused. The first page's failure is an answer, which the page draws in the list's
 * place; a later page's has nowhere to be drawn but the load more that asked for it, so it fails that read, which keeps
 * no answer and is read again on the next load more.
 */
export class MoreIssuesFailed extends Error {}

export type JiraReads = Readonly<{
  // The label of the Account the Project borrows, or null when it has none.
  account: (args: Target) => NamedQuery<string | null>;
  projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
  issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
  people: (args: JiraProjectTarget) => NamedQuery<JiraAnswer<JiraPerson[]>>;
}>;

const byProject = { projectOf: ({ projectId }: Target): string => projectId };

// `argo.fetch` as the Project's Account, which Argo sets the `Authorization` header for.
const borrowing =
  (argo: Pick<Argo, 'fetch'>, projectId: string): JiraSend =>
  (url, init) =>
    argo.fetch(url, { ...init, account: atlassianHost, projectId });

export function defineReads(argo: Argo): JiraReads {
  return {
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
      async ({ projectId, cloudId, projectKey, filters, cursor }: IssuesTarget) => {
        const answer = await callJira(
          borrowing(argo, projectId),
          cloudId,
          jiraRequests.issues(projectKey, { cursor, filters }),
          jiraReaders.issues,
        );

        if (cursor !== null && !answer.ok)
          throw new MoreIssuesFailed(answer.failure.message);

        return answer;
      },
      byProject,
    ),
    people: argo.queries.define(
      'people',
      ({ projectId, cloudId, projectKey }: JiraProjectTarget) =>
        callJira(
          borrowing(argo, projectId),
          cloudId,
          jiraRequests.people(projectKey),
          jiraReaders.people,
        ),
      byProject,
    ),
  };
}
