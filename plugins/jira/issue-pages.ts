import type { ListPage } from '@argo/plugin-kit';
import { seedIssues, type IssueReads } from './issue-reads';
import { callJira, type JiraFailure } from './jira-client';
import type { IssueFilters } from './jira-filters';
import { jiraReaders, type IssuePage, type JiraIssue } from './jira-readers';
import {
  borrowing,
  noted,
  type ProjectTarget,
  type Reading,
} from './jira-reads';
import { jiraRequests } from './jira-requests';

/*
 * One page of a project's filtered issues, as the kit's paged list reads it (ADR-0050). Argo keeps each page as a
 * Query of the Page address and cursor: a load more reads only the page it lacks, a pull reads the first page again,
 * and a write makes every kept page due. So the list calls Jira itself rather than through a named read, whose kept
 * answer a pull would not reach.
 */
export type IssuesTarget = ProjectTarget & {
  filters: IssueFilters;
  cursor: string | null;
};

// Why Jira refused the first page, which the page draws in the list's place.
export type ListFailure = { failed: JiraFailure };

export type ListedItem = JiraIssue | ListFailure;

export const isFailure = (item: ListedItem): item is ListFailure =>
  'failed' in item;

/*
 * A refused first page answers its failure as the list's one item, so the page says why there is no list.
 * The App shows a later refusal at the end of the list.
 */
function refusal(
  { cursor }: IssuesTarget,
  failure: JiraFailure,
): ListPage<ListedItem> {
  if (cursor !== null) return { items: [], failed: failure.message };

  return { items: [{ failed: failure }], cursor: null };
}

const searched = (
  { argo }: Reading,
  target: IssuesTarget,
): ReturnType<typeof callJira<IssuePage>> =>
  callJira({
    send: borrowing(argo, target.projectId),
    cloudId: target.cloudId,
    request: jiraRequests.issues(target.projectKey, target),
    read: jiraReaders.issues,
  });

// Each listed issue seeds the entry its own page reads, so a row opens its issue at once (`issue-reads.ts`).
async function seeded(
  { argo }: Reading,
  { reads, target }: { reads: IssueReads; target: IssuesTarget },
  page: IssuePage,
): Promise<ListPage<ListedItem>> {
  const { projectId, cloudId } = target;

  await seedIssues(argo, reads, {
    target: { projectId, cloudId },
    issues: page.issues,
  });

  return { items: page.issues, cursor: page.cursor };
}

// A token Jira refuses is told to the sign-in page, as every other Jira read tells it.
export async function issuesPage(
  reading: Reading,
  target: IssuesTarget,
  reads: IssueReads,
): Promise<ListPage<ListedItem>> {
  const answer = noted(reading.refused, await searched(reading, target));

  return answer.ok
    ? seeded(reading, { reads, target }, answer.value)
    : refusal(target, answer.failure);
}
