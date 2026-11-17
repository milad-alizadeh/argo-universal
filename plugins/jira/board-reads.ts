import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { readStatuses, statusesRequest } from './board-columns';
import type { JiraStatus } from './issue-fields';
import { callJira, type JiraAnswer } from './jira-client';
import { borrowing, byProject, type IssuesTarget } from './read-scope';

// The board's read (ADR-0037): the Jira project's statuses, which it draws as its columns.
export type BoardReads = Readonly<{
  statuses: (args: IssuesTarget) => NamedQuery<JiraAnswer<JiraStatus[]>>;
}>;

export const defineBoardReads = (argo: Argo): BoardReads => ({
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
