import type { Argo } from '@argo/plugin-kit';
import type { IssueChanges } from './issue-changes';
import type { IssueProjects } from './issue-projects';
import type { IssueSeeds } from './issue-seeds';
import type { TrackerStorage } from './tracker-storage';

// What every Issues page shares: one Plugin's Projects, storage, calls, Sessions and status changes.
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
  seeds: IssueSeeds;
};
