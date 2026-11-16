import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import { defineBoardReads, type BoardReads } from './board-reads';
import { defineIssueReads, seedIssues, type IssueReads } from './issue-reads';
import { callJira, type JiraAnswer, type JiraFailure } from './jira-client';
import { allPages } from './jira-paging';
import { jiraReaders, type IssuePage, type JiraProject } from './jira-readers';
import { jiraRequests } from './jira-requests';
import {
  borrowing,
  byProject,
  type IssuesTarget,
  type SiteTarget,
  type Target,
} from './read-scope';
import { notices } from './sign-in-notices';

/*
 * The Jira reads the pages share, as named reads (ADR-0037): Argo keeps each answer for the Project its args name,
 * and an Operation or a sign-in, which say `argo.changed()`, make them due. Each borrows that Project's
 * `api.atlassian.com` Account, so the Plugin never holds a token. A failure is an answer too, so the page draws it.
 */
export type { SiteTarget } from './read-scope';

export type JiraReads = IssueReads &
  BoardReads &
  Readonly<{
    // The label of the Account the Project borrows, or null when it has none.
    account: (args: Target) => NamedQuery<string | null>;
    projects: (args: SiteTarget) => NamedQuery<JiraAnswer<JiraProject[]>>;
    issues: (args: IssuesTarget) => NamedQuery<JiraAnswer<IssuePage>>;
  }>;

/*
 * What the reads tell the sign-in page: a read that finds no Account, or a token Jira refuses, needs a new token, and
 * a read Jira answers means the sign-in holds again.
 */
export type Refused = (message: string | null) => void;

type Reading = { argo: Argo; refused: Refused };

const refusalOf = (failure: JiraFailure): string | undefined =>
  failure.kind === 'signed-out' ? failure.message : undefined;

function noted<Value>(
  refused: Refused,
  answer: JiraAnswer<Value>,
): JiraAnswer<Value> {
  const refusal = answer.ok ? null : refusalOf(answer.failure);

  if (refusal !== undefined) refused(refusal);

  return answer;
}

type Account = Awaited<ReturnType<Argo['accounts']['get']>>;

const labelOfAccount = (account: Account): string | null =>
  account?.label ?? null;

async function accountLabel({
  argo,
  refused,
}: Reading): Promise<string | null> {
  const label = labelOfAccount(await argo.accounts.get(atlassianHost));

  if (!label) refused(notices.gone);

  return label;
}

const accountRead = (reading: Reading): JiraReads['account'] =>
  reading.argo.queries.define(
    'account',
    (_args: Target) => accountLabel(reading),
    byProject,
  );

const projectPages = (
  argo: Argo,
  { projectId, cloudId }: SiteTarget,
): Promise<JiraAnswer<JiraProject[]>> =>
  allPages((startAt) =>
    callJira({
      send: borrowing(argo, projectId),
      cloudId,
      request: jiraRequests.projects(startAt),
      read: jiraReaders.projects,
    }),
  );

const projectsRead = ({ argo, refused }: Reading): JiraReads['projects'] =>
  argo.queries.define(
    'projects',
    async (target: SiteTarget) =>
      noted(refused, await projectPages(argo, target)),
    byProject,
  );

const issuesPage = (
  argo: Argo,
  { projectId, cloudId, projectKey }: IssuesTarget,
): Promise<JiraAnswer<IssuePage>> =>
  callJira({
    send: borrowing(argo, projectId),
    cloudId,
    request: jiraRequests.issues(projectKey),
    read: jiraReaders.issues,
  });

// A search answers each issue in full, so it seeds the entry each issue's page reads.
const seededPage = async (
  { argo, refused }: Reading,
  seeds: IssueReads,
  target: IssuesTarget,
): Promise<JiraAnswer<IssuePage>> => {
  const { projectId, cloudId } = target;
  const answer = noted(refused, await issuesPage(argo, target));

  return seedIssues(argo, seeds, { target: { projectId, cloudId }, answer });
};

const issuesRead = (reading: Reading, seeds: IssueReads): JiraReads['issues'] =>
  reading.argo.queries.define(
    'issues',
    (target: IssuesTarget) => seededPage(reading, seeds, target),
    byProject,
  );

export function defineReads(argo: Argo, refused: Refused): JiraReads {
  const reading = { argo, refused };
  const issueReads = defineIssueReads(argo);

  return {
    ...issueReads,
    ...defineBoardReads(argo),
    account: accountRead(reading),
    projects: projectsRead(reading),
    issues: issuesRead(reading, issueReads),
  };
}
