import type { Argo } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import type { JiraSend } from './jira-client';

// Every Jira read is kept for the Project its args name, and borrows that Project's Account.
export type Target = { projectId: string };

export type SiteTarget = Target & { cloudId: string };

export type IssuesTarget = SiteTarget & { projectKey: string };

export const byProject = {
  projectOf: ({ projectId }: Target): string => projectId,
};

// `argo.fetch` as the Project's Account, which Argo sets the `Authorization` header for.
export const borrowing =
  (argo: Pick<Argo, 'fetch'>, projectId: string): JiraSend =>
  (url, init) =>
    argo.fetch(url, { ...init, account: atlassianHost, projectId });
