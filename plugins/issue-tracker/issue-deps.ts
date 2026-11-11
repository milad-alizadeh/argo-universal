import type { Argo, DeviceFlow } from '@argo/plugin-kit';
import type { GitHubReads } from './github-reads';
import type { IssueCache } from './issue-cache';
import type { IssueChanges } from './issue-changes';
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
  // The GitHub sign-in the pages draw in place of themselves when no Account answers.
  signIn: DeviceFlow;
  // The remote reads Argo keeps, as named reads.
  reads: GitHubReads;
  // The Issues the Plugin read, which a list, a page and a Slot's summary share.
  issueCache: IssueCache;
};
