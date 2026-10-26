import type { Argo } from '@argo/plugin-kit';
import type { IssueChanges } from './issue-changes';
import type { Project } from './issue-client';
import type { IssueFilter } from './issue-filters';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

// The page paths a row navigates to; each one's page is registered as its row is drawn.
export type IssuePages = {
  projectPagePath: (project: Project) => string;
  filterPagePath: (project: Project, filter: IssueFilter) => string;
  issuePagePath: (project: Project, number: number) => string;
};

// What every Issues page shares: one Plugin's storage, Trackers, open pages and status changes.
export type IssueDeps = {
  listProjects: Argo['projects']['list'];
  storage: TrackerStorage;
  trackers: TrackerRegistry;
  changes: IssueChanges;
  pages: IssuePages;
};
