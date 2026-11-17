import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { issueReaders, type JiraPriority } from './issue-readers';
import { issueRequests } from './issue-requests';
import { callJira, type JiraAnswer } from './jira-client';
import { issueOf, type JiraIssue, type JiraPerson } from './jira-readers';
import { borrowing, byProject, type SiteTarget } from './read-scope';

/*
 * The reads one issue's page makes (ADR-0037): the issue, and the site's priorities its menu offers. The list seeds
 * each issue's entry and reads the priorities beside its people, so an issue opened from its row draws at once.
 */
export type IssueTarget = SiteTarget & { key: string };

// What an issue's page offers to change it to: the site's priorities and the people its Jira project can assign.
export type EditChoices = { priorities: JiraPriority[]; people: JiraPerson[] };

export type IssueReads = Readonly<{
  issue: (args: IssueTarget) => NamedQuery<JiraAnswer<JiraIssue>>;
  // Priorities Jira cannot list now are none, so the page still offers the issue's own.
  priorities: (args: SiteTarget) => NamedQuery<JiraPriority[]>;
}>;

const orNone = <Value>(answer: JiraAnswer<Value[]>): Value[] =>
  answer.ok ? answer.value : [];

const prioritiesOf = async (
  argo: Argo,
  { projectId, cloudId }: SiteTarget,
): Promise<JiraPriority[]> =>
  orNone(
    await callJira({
      send: borrowing(argo, projectId),
      cloudId,
      request: issueRequests.priorities(),
      read: issueReaders.priorities,
    }),
  );

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
  priorities: argo.queries.define(
    'priorities',
    ({ projectId, cloudId }: SiteTarget) =>
      prioritiesOf(argo, { projectId, cloudId }),
    byProject,
  ),
});

// A search answers each issue in full, so it seeds the entry the issue's page reads, which then draws at once.
export async function seedIssues(
  argo: Pick<Argo, 'queries'>,
  { issue }: Pick<IssueReads, 'issue'>,
  { target, issues }: { target: SiteTarget; issues: JiraIssue[] },
): Promise<void> {
  const seed = (found: JiraIssue): Promise<void> =>
    argo.queries.seed(issue({ ...target, key: found.key }), {
      ok: true,
      value: found,
    });

  await Promise.all(issues.map(seed));
}
