import type { Argo, PluginRenderContext } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { createIssuePages } from './issue-pages';
import { IssuesRoot } from './issue-root';
import {
  ProjectDetails,
  projectDetailsItems,
  trackerPath,
} from './project-details';
import { registerSessionFills } from './session-slots';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';

const projectDetails = 'argo/project/details/v1';

type TrackerPage = (props: { context: PluginRenderContext }) => JSX.Element;

function createDeps(api: Argo): IssueDeps {
  const trackers = createTrackerRegistry(api);

  const shared = {
    listProjects: api.projects.list,
    getSession: api.sessions.get,
    storage: createTrackerStorage(api, trackers.has),
    trackers,
    changes: createIssueChanges(),
  };

  return { ...shared, pages: createIssuePages(api, shared) };
}

/*
 * The Tracker choice page: it draws for the Project its view opened for, which is the Project whose details row
 * drilled into it (ADR-0046), and tells Argo the row's value changed once a choice is saved.
 */
function trackerPage(api: Argo, deps: IssueDeps): TrackerPage {
  const { storage, trackers } = deps;

  return ({ context }) => (
    <ProjectDetails
      context={context}
      storage={storage}
      trackers={trackers}
      changed={() => api.slots.changed(projectDetails)}
    />
  );
}

export function register(api: Argo): void {
  const deps = createDeps(api);

  function IssuesPage(): JSX.Element {
    return <IssuesRoot deps={deps} />;
  }

  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  api.pages.register('/', IssuesPage);
  api.pages.register(trackerPath, trackerPage(api, deps));

  api.slots.register(projectDetails, (request) =>
    projectDetailsItems(deps, request),
  );
}
