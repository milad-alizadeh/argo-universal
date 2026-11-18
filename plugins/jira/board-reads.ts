import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { readStatuses, statusesRequest } from './board-columns';
import type { JiraStatus } from './issue-fields';
import { callJira, type JiraAnswer } from './jira-client';
import type { IssueFilters } from './jira-filters';
import { jiraRequests } from './jira-requests';
import { at, type Json } from './json';
import { borrowing, byProject, type IssuesTarget } from './read-scope';

type CountTarget = IssuesTarget & { filters: IssueFilters; statusId: string };

const validCount = (count: number): boolean =>
  Number.isSafeInteger(count) && count >= 0;

function readCount(json: Json | undefined): number | null {
  const count = at(json, 'count');

  return typeof count === 'number' && validCount(count) ? count : null;
}

export type BoardReads = Readonly<{
  statusCount: (args: CountTarget) => NamedQuery<JiraAnswer<number>>;
  statuses: (args: IssuesTarget) => NamedQuery<JiraAnswer<JiraStatus[]>>;
}>;

const statusCountRead = (argo: Argo): BoardReads['statusCount'] =>
  argo.queries.define(
    'statusCount',
    ({ projectId, cloudId, projectKey, filters, statusId }: CountTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: jiraRequests.count(projectKey, filters, statusId),
        read: readCount,
      }),
    byProject,
  );

export const defineBoardReads = (argo: Argo): BoardReads => ({
  statusCount: statusCountRead(argo),
  statuses: argo.queries.define(
    'statuses',
    ({ projectId, cloudId, projectKey }: IssuesTarget) =>
      callJira({
        send: borrowing(argo, projectId),
        cloudId,
        request: statusesRequest(projectKey),
        read: readStatuses,
      }),
    byProject,
  ),
});
