import type { Argo } from '@argo/plugin-kit';
import { defineFilterPage } from './filter-page';
import { githubSignIn, provideGitHub } from './github-account';
import { defineReads } from './github-reads';
import { createIssueCache } from './issue-cache';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { defineIssuePages } from './issue-pages';
import { projectDetailsItems } from './project-details';
import { registerSessionFills } from './session-slots';
import { registerStatusOperation } from './status-operation';
import { defineTrackerPage } from './tracker-page';
import {
  createTrackerRegistry,
  type TrackerRegistry,
} from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';

const projectDetails = 'argo/project/details/v1';

// What the reads and the pages share: the Projects, Sessions, storage, Trackers and the Issues already read.
const createSource = (
  api: Argo,
  trackers: TrackerRegistry,
): Omit<IssueDeps, 'changes' | 'signIn' | 'reads'> => ({
  listProjects: api.projects.list,
  getSession: api.sessions.get,
  storage: createTrackerStorage(api, trackers.has),
  trackers,
  issueCache: createIssueCache(),
});

function createDeps(api: Argo): IssueDeps {
  const base = createSource(api, createTrackerRegistry(api));

  return {
    ...base,
    changes: createIssueChanges(),
    signIn: githubSignIn(api),
    reads: defineReads(api, base),
  };
}

export async function register(api: Argo): Promise<void> {
  const deps = createDeps(api);

  await provideGitHub(api, deps.signIn);
  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  registerStatusOperation(api, deps);
  defineIssuePages(api, deps);
  defineFilterPage(api, deps);
  defineTrackerPage(api, deps);

  api.slots.register(projectDetails, (request) =>
    projectDetailsItems(deps, request),
  );
}
