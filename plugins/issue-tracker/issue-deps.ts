import type { Argo } from '@argo/plugin-kit';
import type { IssueChanges } from './issue-changes';
import type { IssueFilter } from './issue-filters';
import type { Project } from './issue-project';
import type { IssueProjects } from './issue-projects';
import type { IssueSeeds } from './issue-seeds';
import type { LinkChanges } from './session-link-changes';
import type { TrackerStorage } from './tracker-storage';

// The page paths a row navigates to; each one's page is registered as its row is drawn.
export type IssuePages = {
  filterPagePath: (project: Project, filter: IssueFilter) => string;
  issuePagePath: (project: Pick<Project, 'id'>, number: number) => string;
};

// What every Issues page shares: one Plugin's storage, calls, open pages, Sessions and status changes.
export type IssueDeps = {
  // The section's Projects, which its list and pages share.
  projects: IssueProjects;
  listProjects: Argo['projects']['list'];
  // One Session's title and branch, for the Sessions an Agent attached to an Issue.
  getSession: Argo['sessions']['get'];
  // A write that borrows the GitHub Account: a status change.
  fetch: Argo['fetch'];
  storage: TrackerStorage;
  changes: IssueChanges;
  // A Session attached to an Issue or detached from one.
  links: LinkChanges;
  seeds: IssueSeeds;
  pages: IssuePages;
};
