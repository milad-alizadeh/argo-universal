import { IssueDetail, IssueList } from './issue-list.js';
import { ProjectDetails } from './project-details.js';
import { createTrackerRegistry } from './tracker-registry.js';
import { createTrackerStorage } from './tracker-storage.js';
import { useIssuePage } from './use-issues.js';

function IssuePageView({ selected, ...page }) {
  if (selected?.type === 'issue')
    return <IssueDetail {...page} issue={selected.issue} />;

  return <IssueList {...page} />;
}

export function register(api) {
  const trackers = createTrackerRegistry(api);
  const storage = createTrackerStorage(api, trackers.has);

  function IssuesPage() {
    const page = useIssuePage(api, storage, trackers);

    return <IssuePageView {...page} />;
  }

  function ProjectDetailsSlot(props) {
    return (
      <ProjectDetails {...props} storage={storage} trackers={trackers.list()} />
    );
  }

  api.pages.register('/', IssuesPage);
  api.slots.register('argo/project/details/v1', ProjectDetailsSlot);
}
