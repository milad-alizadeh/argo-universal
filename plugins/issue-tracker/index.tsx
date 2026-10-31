import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { createIssuePages } from './issue-pages';
import { IssuesRoot } from './issue-root';
import { ProjectDetails, type ProjectDetailsProps } from './project-details';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';

type SlotProps = Pick<ProjectDetailsProps, 'context'>;

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

export function register(api: Argo): void {
  const deps = createDeps(api);
  const { storage, trackers } = deps;

  function IssuesPage(): JSX.Element {
    return <IssuesRoot deps={deps} />;
  }

  function ProjectDetailsSlot(props: SlotProps): JSX.Element {
    return (
      <ProjectDetails {...props} storage={storage} trackers={trackers.list()} />
    );
  }

  registerIssueOperations(api, { storage });
  api.pages.register('/', IssuesPage);
  api.slots.register('argo/project/details/v1', ProjectDetailsSlot);
}
