import type { Argo } from '@argo/plugin-kit';
import { defineFilterPage } from './filter-page';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { defineIssuePages } from './issue-pages';
import { defineOverview } from './overview';
import { projectDetailsItems } from './project-details';
import { registerSessionFills } from './session-slots';
import { registerStatusOperation } from './status-operation';
import { defineTrackerPage } from './tracker-page';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';

const projectDetails = 'argo/project/details/v1';

function createDeps(api: Argo): IssueDeps {
  const trackers = createTrackerRegistry(api);

  const storage = createTrackerStorage(api, trackers.has);
  const listProjects = api.projects.list;

  return {
    listProjects,
    getSession: api.sessions.get,
    storage,
    trackers,
    changes: createIssueChanges(),
    overview: defineOverview(api, { listProjects, storage, trackers }),
  };
}

export function register(api: Argo): void {
  const deps = createDeps(api);

  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  registerStatusOperation(api, deps);
  defineIssuePages(api, deps);
  defineFilterPage(api, deps);
  defineTrackerPage(api, deps);

  api.slots.register(projectDetails, (request) =>
    projectDetailsItems(deps, request),
  );
}
