import type { Argo, ListPage } from '@argo/plugin-kit';
import { callJira, type JiraFailure } from './jira-client';
import type { IssueFilters } from './jira-filters';
import { jiraReaders, type JiraIssue } from './jira-readers';
import { borrowing, type ProjectTarget } from './jira-reads';
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
 * A refused first page answers its failure as the list's one item, so the page says why there is no list. A later
 * page's has nowhere to be drawn but the load more that asked for it, so it fails that read, which keeps no answer
 * and is read again on the next load more.
 */
function refused(
  { cursor }: IssuesTarget,
  failure: JiraFailure,
): ListPage<ListedItem> {
  if (cursor !== null) throw new Error(failure.message);

  return { items: [{ failed: failure }], cursor: null };
}

export async function issuesPage(
  argo: Pick<Argo, 'fetch'>,
  target: IssuesTarget,
): Promise<ListPage<ListedItem>> {
  const answer = await callJira({
    send: borrowing(argo, target.projectId),
    cloudId: target.cloudId,
    request: jiraRequests.issues(target.projectKey, target),
    read: jiraReaders.issues,
  });

  return answer.ok
    ? { items: answer.value.issues, cursor: answer.value.cursor }
    : refused(target, answer.failure);
}
