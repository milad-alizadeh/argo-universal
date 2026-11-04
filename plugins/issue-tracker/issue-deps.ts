import type { Argo } from '@argo/plugin-kit';
import type { IssueChanges } from './issue-changes';
import type { OverviewQuery } from './overview';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

// What every Issues page shares: one Plugin's storage, Trackers, Sessions and status changes.
export type IssueDeps = {
  listProjects: Argo['projects']['list'];
  // One Session's title and branch, for the Sessions an Agent attached to an Issue.
  getSession: Argo['sessions']['get'];
  storage: TrackerStorage;
  trackers: TrackerRegistry;
  changes: IssueChanges;
  // A Project's overview, as the named read Argo keeps.
  overview: OverviewQuery;
};
